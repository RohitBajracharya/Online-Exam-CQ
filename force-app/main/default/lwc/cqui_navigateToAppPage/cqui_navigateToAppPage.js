import { NavigationMixin } from 'lightning/navigation';
import { api, LightningElement } from 'lwc';
export default class Cqui_navigateToAppPage extends NavigationMixin(LightningElement) {
    @api recordId;

    connectedCallback() {
        console.log("connected");
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: "SQX_Exam__c",
                actionName: "list",
            },
            state: {
                filterName: 'Recent'
            }
        });
    }


}