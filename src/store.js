export class Store {
    constructor(urlPrefix = 'https://doodance-server.herokuapp.com') {
        this.lineItems = [];
        this.products = {};
        this.urlPrefix = urlPrefix;
    }

    // Retrieve the configuration from the API.
    async getConfig() {
        try {
            const response = await fetch(`${this.urlPrefix}/config`, {mode: 'cors'});
            return await response.json();
        } catch (err) {
            return {error: err.message};
        }
    }

    // Load the product details.
    async loadProducts() {
        try {
            const productsResponse = await fetch(`${this.urlPrefix}/products`, {mode: 'cors'});
            const products = (await productsResponse.json()).data;
            products.forEach(product => this.products[product.name] = product);
        } catch (err) {
            return {error: err.message};
        }
    }

    // Add the item with the specified name to the list of line items
    addItemToList(name) {
        if (!this.products) return;
        if (!this.products[name]) throw `${name} is not a known product!`;
        let product = this.products[name];
        let sku = product.skus.data[0];
        this.lineItems.push({
            product: product.name,
            sku: sku.id,
            quantity: 1,
        });
    }

    flushItemList() {
        this.lineItems = [];
    }

    // Create an order object to represent the line items.
    async createOrder(currency, items, email, customer, country) {
        try {
            const response = await fetch(`${this.urlPrefix}/orders/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    currency,
                    items,
                    email,
                    'customer': customer,
                    'country': country
                }),
            });
            const data = await response.json();
            if (data.error) {
                return {error: data.error};
            } else {
                return data.order;
            }
        } catch (err) {
            return {error: err.message};
        }
    }

    // Pay the specified order by sending a payment source alongside it.
    async payOrder(order, source) {
        try {
            const response = await fetch(`${this.urlPrefix}/orders/${order.id}/pay`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({source}),
            });
            const data = await response.json();
            if (data.error) {
                return {error: data.error};
            } else {
                return data;
            }
        } catch (err) {
            return {error: err.message};
        }
    }

    // Fetch an order status from the API.
    async getOrderStatus(orderId) {
        try {
            const response = await fetch(`${this.urlPrefix}/orders/${orderId}`);
            return await response.json();
        } catch (err) {
            return {error: err};
        }
    }

    // Compute the total for the order based on the line items (SKUs and quantity).
    getOrderTotal() {
        return Object.values(this.lineItems).reduce(
            (total, {product, sku, quantity}) =>
                total + quantity * this.products[product].skus.data[0].price,
            0
        );
    }

    // Expose the line items for the order (in a way that is friendly to the Stripe Orders API).
    getOrderItems() {
        let items = [];
        this.lineItems.forEach(item =>
            items.push({
                type: 'sku',
                parent: item.sku,
                quantity: item.quantity,
            })
        );
        return items;
    }
}
