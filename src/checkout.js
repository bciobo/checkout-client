import {Store} from "./store";
import {createPaypalButton} from "./payment_utilities";

// Create a map of the button ids and course names
const courseIdNameMap = new Map();
courseIdNameMap.set("kasse-ww", "Wiener Walzer");
courseIdNameMap.set("kasse-lw", "Langsamer Walzer");
courseIdNameMap.set("kasse-df", "Discofox");
courseIdNameMap.set("kasse-design", "Discofox");

export class Checkout {
    constructor() {
        this.store = new Store();
        // form
        this.formId = 'checkout-form';
        // payment options: radio inputs & buttons
        this.cardRadioInputId = 'kreditkarte-2';
        this.cardElementId = '';
        this.ibanRadioInputId = 'lastschrift-2';
        this.ibanElementId = '';
        this.paypalRadioInputId = 'paypal-2';
        this.paypalButtonContainerId = 'paypal-button-container';
        this.submitButtonContainerId = 'submit-button-container';

        if (this.onCheckoutPage()) {
            let courseKey = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
            this._courseName = courseIdNameMap.get(courseKey);
            this._amount = 6900;
            this.createRefs();
            this.addListeners();
            this.createPaymentElements();
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
    };

    addListeners = () => {
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            console.log('submit event', event)
        });
        this.submitButton.addEventListener('click', event => {
            console.log('submit button clicked', event)
        });

        this.cardRadioInput.onchange = (ev => {
            if (ev.target.checked) this.displayPaymentButton('card')
        });
        this.ibanRadioInput.onchange = (ev => {
            if (ev.target.checked) this.displayPaymentButton('iban')
        });
        this.paypalRadioInput.onchange = (ev => {
            if (ev.target.checked) this.displayPaymentButton('paypal')
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
        createPaypalButton(this.paypalButtonContainerId, this.amount, this.courseName, this.paypalOnValidate,
            this.paypalOnAuthorize, this.paypalOnError, this.paypalOnClick)
    };

    paypalOnClick = () => {
        console.log('paypal button clicked');
    };

    paypalOnError = (error) => {
        console.error('Paypal error:', error);
    };

    paypalOnValidate = (actions) => {
        (this.form.checkValidity()) ? actions.enable() : actions.disable();
    };

    paypalOnAuthorize = () => {
        // TODO handle paypal execution
        // showConfirmationScreen();
        // trackCourseBuy();
    };

    // isMobile = () => {
    //     return window.matchMedia("only screen and (max-width: 760px)").matches;
    // };

    // readUrl = () => {
    //     const courseKey = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
    //     const courseName = courseIdNameMap.get(courseKey);
    //     if (courseName) {
    //         displaySelectedCourse();
    //     }
    // };

    onCheckoutPage = () => {
        const courseKey = window.location.href.substr(
            window.location.href.lastIndexOf("/") + 1
        );
        //TODO remove "kasse-design"
        return (['kasse-ww', 'kasse-lw', 'kasse-df', 'kasse-design'].indexOf(courseKey) > -1);
    };
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

