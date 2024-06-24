import { LightningElement, wire, track } from 'lwc';
import getExamData from '@salesforce/apex/ExamController.getExamData';

export default class CandidateResponse extends LightningElement {
    @track data = [];
    columns = [
        { label: 'Assign To', fieldName: 'assignTo', type: 'text' },
        { label: 'Set', fieldName: 'examSet', type: 'text' },
        { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number' },
        { label: 'Actions', fieldName: 'actions',
            type: 'button',
            typeAttributes: {
                label: 'View Details',
                name: 'view_details',
                title: 'Click to View Details'
            }
        }
    ];

    @wire(getExamData)
    wiredExams({ error, data }) {
        if (data) {
            this.data = data;
        } else if (error) {
            console.error(error);
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
        // Handle the view details action for the specific row
        console.log('View details for:', row);
        // You can implement logic to navigate to a detailed view or show details in a modal here
    }
}
