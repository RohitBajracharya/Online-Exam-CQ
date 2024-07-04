import getExamData from '@salesforce/apex/SQX_candidateResponseController.getExamData';
import { NavigationMixin } from 'lightning/navigation';
import { LightningElement, track, wire } from 'lwc';


const columns = [
    { label: 'Assign To', fieldName: 'assignTo', type: 'text' },
    { label: 'Set', fieldName: 'examSet', type: 'text' },
    { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number' },
    { label: 'Admin Approval', fieldName: 'adminApproved', type: 'text' },
    { label: 'Status', fieldName: 'status', type: 'text', cellAttributes: { class: { fieldName: 'statusClass' } } },
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

 

    // retrieves candidateResponse values and bind in data varaible
    @wire(getExamData)
    wiredExams(result) {
        if (result.data) {
            this.data = result.data.map(row => {
                return {
                    ...row,
                    obtainedMarks: row.obtainedMarks,
                    adminApproved: row.adminApproved,
                    status: row.passStatus,
                    // fullMarks: row.fullMarks
                };
            });
        } else if (result.error) {
            console.error(result.error);
        }
    }

    

    // getter to show color of passStatus text color
    get dataWithStatusClass() {
        return this.data.map(row => {
            let statusClass;
            if (row.status === 'Pass') {
                statusClass = 'slds-text-color_success';
            } else if (row.status === 'Fail') {
                statusClass = 'slds-text-color_error';
            }
            return { ...row, statusClass };
        });
    }

    // Getter to return data with dynamically computed statusClass
    get transformedData() {
        return this.dataWithStatusClass;
    }

    // gets called when users cicks 'View Details' button
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

    // method that navigate the user to particular candidate response result page
    handleViewDetails(row) {
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
