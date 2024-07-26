
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, api } from 'lwc';

export default class Cqui_toastMessageScreenFlow extends LightningElement {
    @api title;
    @api message;
    @api variant;
    @api delay;
    @api recordName;
    @api url;
    @api actionLabel;


    renderedCallback() {
        this.showToastMessage();
    }

    showToastMessage = () => {
        console.log("toast");
        const regex = /FIELD_CUSTOM_VALIDATION_EXCEPTION:([^\.]+\.[^\.]+\.)/;
        console.log("Essa:: " + this.message);
        var matchMessage = this.message.match(regex);
        var finalMessage = matchMessage ? matchMessage[1].trim() : '';
        console.log("message:: " + finalMessage);
        let toastMessage = {
            title: this.title,
            message: finalMessage,
            variant: this.variant ? this.variant : 'info'
        };
        if (this.recordName && this.url) {
            toastMessage.messageData = [
                this.recordName,
                {
                    url: this.url,
                    label: this.actionLabel,
                },
            ]
        }
        if (this.delay) {
            setTimeout(() => {
                this.fireToastMessage(toastMessage);
            }, this.delay);
        } else {
            this.fireToastMessage(toastMessage);
        }
    }

    fireToastMessage = (toastMessage) => {
        window.console.log('Toast Message: ', toastMessage);
        this.dispatchEvent(new ShowToastEvent(toastMessage));
    }
}