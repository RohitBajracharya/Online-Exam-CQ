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
    wiredExamData;
    // fullMarksMap = new Map();

    @wire(getExamData)
    wiredExams(result) {
        console.log('result: ' + JSON.stringify(result.data));
        this.wiredExamData = result;

        if (result.data) {
            console.log('vvvvvvvvvv' + JSON.stringify(result.data));
            this.data = result.data.map(row => {
                // this.fullMarksMap.set(row.id, row.fullMarks); // Store fullMarks in a map with id as key
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

    // handleCellChange(event) {
    //     const draftValuesMap = new Map(this.draftValues.map(draft => [draft.id, draft]));
    //     event.detail.draftValues.forEach(draft => {
    //         draftValuesMap.set(draft.id, { ...draftValuesMap.get(draft.id), ...draft });
    //     });
    //     this.draftValues = Array.from(draftValuesMap.values());
    // }

    // showToast(title, message, variant) {
    //     const event = new ShowToastEvent({
    //         title: title,
    //         message: message,
    //         variant: variant,
    //     });
    //     this.dispatchEvent(event);
    // }
}
