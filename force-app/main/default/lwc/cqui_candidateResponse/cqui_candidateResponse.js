import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getExamData from '@salesforce/apex/SQX_candidateResponseController.getExamData';

const columns = [
    { label: 'Assign To', fieldName: 'assignTo', type: 'text' },
    { label: 'Set', fieldName: 'examSet', type: 'text' },
    { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number'},
    { label: 'Admin Approval', fieldName: 'adminApproved', type: 'picklist'},
    { label: 'Status', fieldName:'status', type:'picklist'},
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
    @track draftValues = [];
    wiredExamData;

    @wire(getExamData)
    wiredExams(result) {
        console.log('result: ' + JSON.stringify(result.data));
        this.wiredExamData = result;
        if (result.data) {
            console.log('vvvvvvvvvv'+JSON.stringify(result.data));
            this.data = result.data.map(row => {
                return {
                    ...row,
                    obtainedMarks: row.obtainedMarks,
                    adminApproved: row.adminApproved,
                    status: row.passStatus,
                };
            });
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
                break;
        }
    }

    handleViewDetails(row) {
        console.log('View details for:', row);
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: row.id,
                objectApiName: 'SQX_Candidate_Response__c',
                actionName: 'view'
            }
        });
    }

}
