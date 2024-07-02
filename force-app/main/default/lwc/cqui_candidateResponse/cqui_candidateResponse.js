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
    // fullMarksMap = new Map();

    @wire(getExamData)
    wiredExams(result) {
        console.log('result: ' + JSON.stringify(result.data));
        this.wiredExamData = result;
        
        if (result.data) {
            console.log('vvvvvvvvvv'+JSON.stringify(result.data));
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

    // handleSave(event) {
    //     console.log("save");
    //     const updatedFields = event.detail.draftValues;
        
    //     const id = updatedFields[0].id;
    //     const obtainedMarks = updatedFields[0].obtainedMarks;
    //     const fullMarks = this.fullMarksMap.get(id); // Get fullMarks from the map using id

    //     console.log('Updated Fields:', JSON.stringify(updatedFields));
    //     console.log('id:', JSON.stringify(id));
    //     console.log('obtainedMarks:', obtainedMarks);
    //     console.log('fullMarks:', fullMarks);

    //     // Validation
    //     if (fullMarks < obtainedMarks) {
    //         this.showToast('Error', 'Obtained marks should be less than or equal to full marks', 'error');
    //         return;
    //     }

    //     updateExamData({ recordId: id, obtainedMarks: obtainedMarks })
    //         .then((result) => {
    //             console.log('...............' + JSON.stringify(result));
    //             this.showToast('Success', 'Records updated successfully', 'success');
    //             this.draftValues = [];
    //             return refreshApex(this.wiredExamData);
    //         })
    //         .catch(error => {
    //             this.showToast('Error', 'Failed to update records', 'error');
    //             console.error('Error updating records:', error);
    //         });
    // }

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
