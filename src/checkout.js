import "isomorphic-fetch";
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
courseIdNameMap.set("kasse-ww2", "Wiener Walzer");
courseIdNameMap.set("kasse-lw", "Langsamer Walzer");
courseIdNameMap.set("kasse-lw2", "Langsamer Walzer");
courseIdNameMap.set("kasse-df", "Discofox");
courseIdNameMap.set("kasse-df2", "Discofox");
courseIdNameMap.set("kasse-design", "Langsamer Walzer");

//TODO remove all console output
export class Checkout {
    constructor() {
        this.store = new Store();
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
        this.countryDropdownElementId = 'land';
        this.couponFormElementId = 'wf-form-Gutschein-Form';
        this.couponErrorMessageElementId = 'coupon-error-message';
        this.totalPriceElementId = 'gesamt';
        this.discountElementId = 'discount';
        this.discountBlockElementId = 'discount-block';
        this.couponUsed = false;

        if (onCheckoutPage()) {
            // identify selected course based on URL
            let courseKey = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
            this.courseName = courseIdNameMap.get(courseKey);
            // fetch config
            this.store.getConfig().then(config => {
                this._config = config;
                // fetch products
                this.store.loadProducts().then(() => {
                    this.store.addItemToList(this.courseName);

                    this.amount = () => {
                        if (this.newPrice) {
                            return this.newPrice * 100;
                        } else {
                            return this.store.getOrderTotal();
                        }
                    };
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
        this.couponForm = document.getElementById(this.couponFormElementId);
        this.submitButton = this.form.querySelector('input[type=submit]');
        this.couponSubmitButton = this.couponForm.querySelector('input[type=submit]');
        this.submitButtonContainer = document.getElementById(this.submitButtonContainerId);
        this.cardRadioInput = document.getElementById(this.cardRadioInputId);
        this.ibanRadioInput = document.getElementById(this.ibanRadioInputId);
        this.paypalRadioInput = document.getElementById(this.paypalRadioInputId);
        this.paypalbuttonContainer = document.getElementById(this.paypalButtonContainerId);
        this.checkboxElement = document.getElementById(this.checkboxElementId);
        this.countryDropdownElement = document.getElementById(this.countryDropdownElementId);
        this.couponErrorMessage = document.getElementById(this.couponErrorMessageElementId);
        this.totalPrice = document.getElementById(this.totalPriceElementId);
        this.discount = document.getElementById(this.discountElementId);
        this.discountBlock = document.getElementById(this.discountBlockElementId);
    };

    addListeners = () => {
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            event.stopPropagation();

            this.handleSubmit().then(res => console.log('Submit handled!'));
        });
        this.couponForm.addEventListener('submit', event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.couponUsed) {
                this.couponErrorMessage.textContent = 'Nur ein Gutschein einlösbar pro Bestellung.';
                return;
            }
            this.handleCouponSubmit().then(res => console.log('Coupon submit handled!'));
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
        this.countryDropdownElement.onchange = (ev => {
            if (ev.target.value === 'Anderes Land außerhalb EU') {
                this.toggleSEPAPaymentVisibility(true);
            } else {
                this.toggleSEPAPaymentVisibility(false);
            }
        });
    };

    toggleSEPAPaymentVisibility(hide) {
        const ibanContainer = document.getElementById('iban-container');

        if (!ibanContainer.contains(this.ibanRadioInput)) {
            console.error('HTML Document structure changed. Cannot identify IBAN element correctly for visibility' +
                ' toggle.');
            return;
        }
        if (hide) {
            ibanContainer.style.visibility = 'hidden';
            ibanContainer.style.height = 0;
        } else {
            ibanContainer.style.visibility = 'visible';
            ibanContainer.style.height = 'initial';
        }
    }

    displayPaymentButton = (paymentMethod) => {
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
    };

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
        if (!this.form.checkValidity()) this.submitButton.click();
    };

    paypalOnError = (error) => {
        console.error('Paypal error:', error);
        trackCourseFail(this.courseName);
        setTimeout(() => window.location.href = failureUrl, 1000);
    };

    paypalOnValidate = (actions) => {
        (this.form.checkValidity()) ? actions.enable() : actions.disable();
    };

    paypalOnAuthorize = () => {
        trackCourseBuy(this.courseName, this.amount());
        window.location.href = successUrl;
    };

    async handleCouponSubmit() {
        // Disable the "Einlösen" button
        this.couponSubmitButton.disabled = true;
        // Get current price
        this.couponCode = this.couponForm.querySelector('input[type=text]').value;
        const price = this.totalPrice.textContent;
        // Validate coupon code
        const validationResult = await this.store.validateCoupon(this.couponCode, price);

        if (!validationResult) {
            this.couponErrorMessage.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
            this.couponErrorMessage.setAttribute('style', "display: block");
            this.couponSubmitButton.disabled = false;
        } else if (validationResult.error) {
            this.couponErrorMessage.textContent = validationResult.error;
            this.couponErrorMessage.setAttribute('style', "display: block");
            this.couponSubmitButton.disabled = false;
        } else {
            this.couponErrorMessage.setAttribute('style', "display: none;");
            this.totalPrice.textContent = validationResult.new_price.toString() + '€';
            this.discount.textContent = validationResult.discount.toString() + '€';
            this.discountBlock.setAttribute('style', "display: block");
            this.couponUsed = true;
            this.newPrice = validationResult.new_price;
        }
    }

    async handleSubmit() {
        // Disable the Pay button to prevent multiple click events.
        this.submitButton.disabled = true;
        // Retrieve the user information from the form.
        this.name = this.form.querySelector('input[id=nam]').value;
        this.email = this.form.querySelector('input[id=email-4]').value;
        this.country = this.form.querySelector('select[id=land] option:checked').value;
        // Create the order using the email and shipping information from the form.
        const order = await this.store.createOrder(
            'eur', this.store.getOrderItems(), this.email, this.name, this.country
        );
        const metadata = {
            course: this.courseName,
        };
        if (this.couponUsed) metadata.coupon_code = this.couponCode;
        if (this.payment === 'card') {
            // Create a Stripe source from the card information and the owner name.
            const {source} = await
                this.stripe.createSource(this.card, {
                    owner: {
                        name: this.name,
                    },
                    metadata: metadata
                });
            await handleOrder(order, source, this.submitButton, this.store, this.courseName, this.amount(), this.couponCode);
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
                metadata: metadata
            };
            const {source} = await this.stripe.createSource(this.iban, sourceData);
            await handleOrder(order, source, this.submitButton, this.store, this.courseName, this.amount(), this.couponCode);
        } else {
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

