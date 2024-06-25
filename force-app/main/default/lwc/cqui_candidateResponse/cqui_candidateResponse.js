import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getExamData from '@salesforce/apex/SQX_candidateResponseController.getExamData';
import { refreshApex } from '@salesforce/apex';

const columns = [
    { label: 'Assign To', fieldName: 'assignTo', type: 'text' },
    { label: 'Set', fieldName: 'examSet', type: 'text' },
    { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number', editable: true },
    { label: 'Admin Approval', fieldName: 'adminApproved', type: 'picklist', editable: true },
    {
        label: 'Actions', fieldName: 'actions',
        type: 'button',
        typeAttributes: {
            label: 'View Details',
            name: 'view_details',
            title: 'Click to View Details',
            variant: 'brand',
            target: '_self'
        }
    }
];

export default class CandidateResponse extends NavigationMixin(LightningElement) {
    @track data = [];
    @track columns = columns;

    @wire(getExamData)
    wiredExams(result) {
        this.refreshTable(result);
    }

    refreshTable(result) {
        if (result.data) {
            this.data = result.data.map(row => ({
                ...row,
                obtainedMarks: row.obtainedMarks,
                adminApproval: row.adminApproval
            }));
        } else if (result.error) {
            console.error(result.error);
        }
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'view_details':
                this.handleViewDetails(row);
                break;
            default:
                // Handle other actions if needed
                break;
        }
    }

    handleViewDetails(row) {
        console.log('View details for:', row);
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: row.id,
                objectApiName: 'SQX_Candidate_Response__c', // Replace with your object API name
                actionName: 'view'
            }
        });
    }

    handleSave(event) {
        const updatedFields = event.detail.draftValues;
        console.log('Updated fields', updatedFields);
        // Example: Call Apex method to save data
        // refreshApex(this.wiredResult); // Uncomment if using refreshApex function
    }
}