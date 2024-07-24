import getExamData from '@salesforce/apex/SQX_candidateResponseController.getExamData';
import { NavigationMixin } from 'lightning/navigation';
import { LightningElement, track, wire } from 'lwc';


const columns = [
    { label: 'Assign To', fieldName: 'assignTo', type: 'text' , sortable: true},
    { label: 'Set', fieldName: 'examSet', type: 'text'},
    { label: "Date",fieldName: "recordDate",type: "date",
        typeAttributes:{
            year: "numeric",
            month: "long",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: 'Asia/Kathmandu'
        },
        sortable: true
    },
    { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number',cellAttributes: { alignment: 'left' }},
    { label: 'Admin Approval', fieldName: 'adminApproved', type: 'text', sortable: true },
    { label: 'Status', fieldName: 'status', type: 'text', cellAttributes: { class: { fieldName: 'statusClass' } }},
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
    @track searchTerm = '';
    @track filteredData = [];
    @track sortedBy;
    @track sortDirection='asc';

 

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
            this.updateDisplayedCandidates();
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

    handleSearchTermChange(event) {
        this.searchTerm = event.target.value.toLowerCase().trim();
        this.updateDisplayedCandidates();
    }

    updateDisplayedCandidates() {
        const searchTerm = this.searchTerm.toLowerCase();
        console.log('Data Before Filtering:', this.data); // Debugging line
        this.filteredData = this.data.filter(record => {
            const assignTo = record.assignTo ? record.assignTo.toLowerCase() : '';
            const examSet = record.examSet ? record.examSet.toLowerCase() : '';
            const adminApproved = record.adminApproved ? record.adminApproved.toLowerCase() : '';
            const status = record.status ? record.status.toLowerCase() : '';
            const recordDate = record.recordDate ? new Date(record.recordDate).toLocaleString('en-US', { 
                timeZone: 'Asia/Kathmandu',
                month: 'long', 
                day: 'numeric', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            }).toLowerCase() : '';
            const recordDateWithoutSpaces = recordDate.replace(/\s+/g, '');
            return assignTo.includes(searchTerm) ||
                   examSet.includes(searchTerm) ||
                   adminApproved.includes(searchTerm) ||
                   status.includes(searchTerm) ||
                   recordDate.includes(searchTerm) ||
                   recordDateWithoutSpaces.includes(searchTerm);
        });
        console.log('Filtered Data:', this.filteredData); // Debugging line
    
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.data];

        cloneData.sort(this.sortBy(sortedBy, sortDirection));
        
        this.data = cloneData;
        this.sortedBy = sortedBy;
        this.sortedDirection = sortDirection;
        this.updateDisplayedCandidates();
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? function(x) {
                return primer(x[field]);
            }
            : function(x) {
                return x[field];
            };

        reverse = reverse === 'asc' ? 1 : -1;

        return function(a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }
}