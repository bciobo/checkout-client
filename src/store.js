export class Store {
    constructor(urlPrefix = 'https://doodance-server.herokuapp.com') {
        this.lineItems = [];
        this.products = {};
        this.urlPrefix = urlPrefix;
    }


    // Retrieve the configuration from the API.
    async getConfig() {
        try {
            const response = await fetch(`${this.urlPrefix}/config/`, {mode: 'cors'});
            return await response.json();
        } catch (err) {
            return {error: err.message};
        }
    }

    // Load the product details.
    async loadProducts(courseName) {
        try {
            const rsp = await fetch(`${this.urlPrefix}/products/${courseName}`, {mode: 'cors'});
            const rspJson = await rsp.json();
            const paymentIntent = rspJson.intent;
            const products = rspJson.products.data;
            products.forEach(product => this.products[product.name] = product);
            return paymentIntent;
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
                    'country': country,
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

    async updatePaymentIntent(currency, items, email, customer, country, payment_intent_id) {
        try {
            const sku = items[0].parent;
            const response = await fetch(`${this.urlPrefix}/intents/${payment_intent_id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    order: {
                        currency,
                        sku,
                        email,
                        'customer': customer,
                        'country': country,
                    }
                }),
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

    // Validate coupon input by the client and return result.
    async validateCoupon(code, price, paymentIntentId) {
        try {
            // const response =
            const response = await fetch(`${this.urlPrefix}/validate-coupon/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    'code': code,
                    'price': price.replace('€', ''),
                    'payment_intent_id': paymentIntentId
                }),
            });
            switch (response.status) {
                case 400:
                case 403:
                case 404:
                    let data = await response.text();
                    return {'error': data};
                case 200:
                    data = await response.json();

                    return data;
                default:
                    return null;
            }
        } catch (err) {
            return {error: 'Something went wrong, please try again later.'};
        }
    }

    // Pay the specified order by sending a payment source alongside it.
    async payOrder(order, source, newPrice, couponCode) {
        const body = couponCode ? JSON.stringify({source, 'new_price': newPrice, 'coupon_code': couponCode}) :
            JSON.stringify({source});
        try {
            const response = await fetch(`${this.urlPrefix}/orders/${order.id}/pay`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: body,
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
