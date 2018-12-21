import {Store} from "./store";
import {
    createPaypalButton, elementsOptions,
    failureUrl, successUrl,
    handleOrder,
    trackCourseBuy, trackCourseFail,
    onCheckoutPage
} from "./payment_utilities";

// Create a map of course ids to course names
const courseIdNameMap = new Map();
courseIdNameMap.set("kasse-ww", "Wiener Walzer");
courseIdNameMap.set("kasse-lw", "Langsamer Walzer");
courseIdNameMap.set("kasse-df", "Discofox");
courseIdNameMap.set("kasse-design", "Langsamer Walzer");

//TODO remove all console output
export class Checkout {
    constructor() {
        this.store = new Store('http://127.0.0.1:7002');
        // form
        this.formId = 'checkout-form';
        // payment options: radio inputs & buttons
        this.cardRadioInputId = 'kreditkarte-2';
        this.cardElementId = 'card-element';
        this.cardErrosElementId = 'card-errors';
        this.ibanRadioInputId = 'lastschrift-2';
        this.ibanElementId = 'iban-element';
        this.ibanErrosElementId = 'iban-errors';
        this.paypalRadioInputId = 'paypal-2';
        this.paypalButtonContainerId = 'paypal-button-container';
        this.submitButtonContainerId = 'submit-button-container';
        this.checkboxElementId = 'checkbox';

        if (onCheckoutPage()) {
            // identify selected course based on URL
            let courseKey = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
            this._courseName = courseIdNameMap.get(courseKey);
            // fetch config
            this.store.getConfig().then(config => {
                this._config = config;
                // fetch products
                this.store.loadProducts().then(() => {
                    this.store.addItemToList(this._courseName);

                    this._amount = this.store.getOrderTotal();
                    // initialize payment objects
                    this.createPaymentElements();
                });
            });

            this.createRefs();
            this.addListeners();
        } else console.warn('Not on a checkout page. Stopping.');
    }

    createRefs = () => {
        this.form = document.getElementById(this.formId);
        this.submitButton = this.form.querySelector('input[type=submit]');
        this.submitButtonContainer = document.getElementById(this.submitButtonContainerId);
        this.cardRadioInput = document.getElementById(this.cardRadioInputId);
        this.ibanRadioInput = document.getElementById(this.ibanRadioInputId);
        this.paypalRadioInput = document.getElementById(this.paypalRadioInputId);
        this.paypalbuttonContainer = document.getElementById(this.paypalButtonContainerId);
        this.checkboxElement = document.getElementById(this.checkboxElementId);
    };

    addListeners = () => {
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            event.stopPropagation();
            console.log('submit event', event)
            this.handleSubmit().then(res => console.log('Submit handled!'));
        });
        //TODO remove listener for submit button
        this.submitButton.addEventListener('click', event => {
            console.log('submit button clicked', event)
        });

        this.cardRadioInput.onchange = (ev => {
            if (ev.target.checked) {
                this.payment = 'card';
                this.displayPaymentButton(this.payment);
            }
        });
        this.ibanRadioInput.onchange = (ev => {
            if (ev.target.checked) {
                this.payment = 'iban';
                this.displayPaymentButton(this.payment);
            }
        });
        this.paypalRadioInput.onchange = (ev => {
            if (ev.target.checked) {
                this.payment = 'paypal';
                this.displayPaymentButton(this.payment);
            }
        });

    };

    displayPaymentButton(paymentMethod) {
        switch (paymentMethod) {
            case 'paypal':
                this.submitButtonContainer.setAttribute('style', "display: none");
                this.paypalbuttonContainer.setAttribute('style', "display: block");
                break;
            case 'iban':
            case 'card':
                this.submitButtonContainer.setAttribute('style', "display: block");
                this.paypalbuttonContainer.setAttribute('style', "display: none");
                break;
        }
    }

    get courseName() {
        return this._courseName;
    }

    get amount() {
        return this._amount;
    }

    createPaymentElements = () => {
        // Init Paypal payment button
        createPaypalButton(this.paypalButtonContainerId, this.amount, this.courseName, this.paypalOnValidate,
            this.paypalOnAuthorize, this.paypalOnError, this.paypalOnClick, this.checkboxElement);
        // Init Stripe SDK
        try {
            this.stripe = Stripe(this._config.stripePublishableKey);
        } catch (e) {
            console.error('Encountered problem while initializing Stripe SDK', e);
            return;
        }
        // Create an instance of Elements.
        const elements = this.stripe.elements();
        // Create payment elements
        this.card = elements.create('card', elementsOptions);
        this.iban = elements.create('iban', {style: elementsOptions['style'], supportedCountries: ['SEPA']});
        // Mount payment elements on the page.
        this.card.mount(`#${this.cardElementId}`);
        this.iban.mount(`#${this.ibanElementId}`);
        // Listen to changes and display errors
        this.card.addEventListener('change', ({error}) => this.stripeOnChange(error, this.cardErrosElementId));
        this.iban.addEventListener('change', ({error}) => this.stripeOnChange(error, this.ibanErrosElementId));
    };

    stripeOnChange = (error, errorElementId) => {
        const errorsElement = document.getElementById(errorElementId);
        if (error) {
            errorsElement.textContent = error.message;
            errorsElement.setAttribute('style', "display: block");
        } else {
            errorsElement.setAttribute('style', "display: none");
        }
        // Re-enable the Pay button.
        this.submitButton.disabled = false;
    };

    paypalOnClick = () => {
        console.log('paypal button clicked');
        if (!this.form.checkValidity()) this.submitButton.click();
    };

    paypalOnError = (error) => {
        console.error('Paypal error:', error);
        trackCourseFail(this.courseName);
        window.location.href = failureUrl;
    };

    paypalOnValidate = (actions) => {
        (this.form.checkValidity()) ? actions.enable() : actions.disable();
    };

    paypalOnAuthorize = () => {
        console.error('Paypal authorized!');
        trackCourseBuy(this.courseName, this.amount);
        window.location.href = successUrl;
    };

    async handleSubmit() {
        // Disable the Pay button to prevent multiple click events.
        this.submitButton.disabled = true;
        // Retrieve the user information from the form.
        this.name = this.form.querySelector('input[id=nam]').value;
        this.email = this.form.querySelector('input[id=email-4]').value;
        this.country = this.form.querySelector('select[id=land] option:checked').value;
        console.log(this.payment, this.name, this.country);
        // Create the order using the email and shipping information from the form.

        const order = await this.store.createOrder(
            'eur', this.store.getOrderItems(), this.email, this.name, this.country
        );

        if (this.payment === 'card') {
            // Create a Stripe source from the card information and the owner name.
            const {source} = await
                this.stripe.createSource(this.card, {
                    owner: {
                        name: this.name,
                    },
                    metadata: {
                        course: this.courseName,
                    }
                });
            await handleOrder(order, source, this.submitButton, this.store, this.courseName, this.amount);
        } else if (this.payment === 'iban') {
            // Create a SEPA Debit source from the IBAN information.
            const sourceData = {
                type: 'sepa_debit',
                currency: order.currency,
                owner: {
                    name: this.name,
                    email: this.email,
                },
                mandate: {
                    // Automatically send a mandate notification email to your customer
                    // once the source is charged.
                    notification_method: 'email',
                },
                metadata: {
                    course: this.courseName,
                }
            };
            const {source} = await this.stripe.createSource(this.iban, sourceData);
            await handleOrder(order, source, this.submitButton, this.store, this.courseName, this.amount);
        } else {
            console.error("Unexpected payment method identifier!");
            trackCourseFail(this.courseName);
            window.location.href = failureUrl;
        }
    }
}


const injectDependency = (d, src) => {
    const script = d.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = src;
    d.getElementsByTagName('head')[0].appendChild(script);
};

injectDependency(document, 'https://www.paypalobjects.com/api/checkout.js');
injectDependency(document, 'https://js.stripe.com/v3/');

document.onreadystatechange = () => {
    if (document.readyState === 'complete') window.checkout = new Checkout();
};

