// Prepare the options for Elements to be styled accordingly.
const elementsOptions = {
    style: {
        base: {
            iconColor: '#666ee8',
            color: '#31325f',
            fontWeight: 400,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '15px',
            '::placeholder': {
                color: '#aab7c4',
            },
            ':-webkit-autofill': {
                color: '#666ee8',
            },
        },
    },
};


export const paymentMethods = {
    card: {
        name: 'Card',
        flow: 'none',
    },
    sepa_debit: {
        name: 'SEPA Direct Debit',
        flow: 'none',
        countries: ['FR', 'DE', 'ES', 'BE', 'NL', 'LU', 'IT', 'PT', 'AT', 'IE'],
    },
    sofort: {
        name: 'SOFORT',
        flow: 'redirect',
        countries: ['DE', 'AT'],
    },
    paypal: {
        name: 'PayPal',
        flow: 'paypal'
    }
};


export const createCardElement = (stripe, elementId, submitButton, errorsElement) => {
    // Create an instance of Elements.
    const elements = stripe.elements();
    const card = elements.create('card', elementsOptions);

    // Mount the Card Element on the page.
    card.mount(elementId);

    // Monitor change events on the Card Element to display any errors.
    card.addEventListener('change', ({error}) => {
        // const cardErrors = document.getElementById('card-errors');
        if (error) {
            errorsElement.textContent = error.message;
            errorsElement.classList.add('visible');
        } else {
            errorsElement.classList.remove('visible');
        }
        // Re-enable the Pay button.
        submitButton.disabled = false;
    });

    return card;
};

export const createIbanElement = (stripe, elementId, submitButton, errorsElement) => {
    // Create an instance of Elements.
    const elements = stripe.elements();
    // Create a IBAN Element and pass the right options for styles and supported countries.
    const iban = elements.create('iban', {style: elementsOptions['style'], supportedCountries: ['SEPA']});

    // Mount the IBAN Element on the page.
    iban.mount('#iban-element');

    // Monitor change events on the IBAN Element to display any errors.
    iban.on('change', ({error, bankName}) => {
        // const ibanErrors = document.getElementById('iban-errors');
        if (error) {
            errorsElement.textContent = error.message;
            errorsElement.classList.add('visible');
        } else {
            errorsElement.classList.remove('visible');
            if (bankName) {
                //TODO: check if updating button label is necessary here
                // updateButtonLabel('sepa_debit', bankName);
            }
        }
        // Re-enable the Pay button.
        submitButton.disabled = false;
    });
};

export const createPaypalButton = (paypalButtonContainerId, amountCallback, courseNameCallback,
                                   validateHandler, authorizeHandler, errorHandler, clickHandler) => {
    paypal.Button.render({

        env: 'production', // sandbox | production
        locale: 'de_DE',

        // PayPal Client IDs - replace with your own
        // Create a PayPal app: https://developer.paypal.com/developer/applications/create
        client: {
            sandbox: 'Afftm3m1c0dUx734SjzbUduO62yQzhxT2J1BptiJF9JfVGhqpMwt4q4rJY-6oLyE5LpB1Adm391Vzner',
            production: null
            // production: 'AbRWBZnmecOZ6uTdLcqKWOukOCq5LiKmTDIZUSeb0olKO2U2FpOlN0ysMI0mR3r6SEsl6iPsbpOuh4xa'
        },
        style: {
            label: 'paypal',
            size: 'responsive',    // small | medium | large | responsive
            shape: 'rect',     // pill | rect
            color: 'blue',     // gold | blue | silver | black
            tagline: false
        },

        // Show the buyer a 'Pay Now' button in the checkout flow
        commit: true,

        validate: function (actions) {
            validateHandler(actions)
        },

        // payment() is called when the button is clicked
        payment: function (data, actions) {
            // Make a call to the REST api to create the payment
            return actions.payment.create({
                payment: {
                    intent: 'sale',
                    transactions: [
                        {
                            amount: {
                                total: amountCallback() / 100,
                                currency: 'EUR',
                            },
                            description: courseNameCallback,
                            reference_id: courseNameCallback.toLocaleLowerCase().split(' ').join('-'),
                            item_list: {
                                items: [
                                    {
                                        name: courseNameCallback,
                                        sku: "1",
                                        price: (amountCallback() / 100).toString() + ".00",
                                        currency: "EUR",
                                        quantity: "1",
                                        description: courseNameCallback,
                                    },
                                ]
                            }
                        }
                    ]
                }
            });
        },

        // onAuthorize() is called when the buyer approves the payment
        onAuthorize: function (data, actions) {
            return actions.payment.execute().then(authorizeHandler())
        },

        // called if the buyer cancels the payment
        // By default, the buyer is returned to the original page,
        // but you're free to use this function to take them to a different page.
        onCancel: function (data, actions) {
            /*
             * Buyer cancelled the payment
             */
        },
        // called when an error occurs
        // You can allow the buyer to re-try or show an error message
        onError: function (err) {
            errorHandler(err)
        },
        // called for every click on the PayPal button
        onClick: function () {
            clickHandler()
        }

    }, paypalButtonContainerId);
};
