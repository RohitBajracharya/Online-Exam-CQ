import getExamData from '@salesforce/apex/SQX_candidateResponseController.getExamData';
import { NavigationMixin } from 'lightning/navigation';
import { LightningElement, track, wire } from 'lwc';

const columns = [
    { label: 'Assign To', fieldName: 'assignTo', type: 'text', sortable: true },
    { label: 'Set', fieldName: 'examSet', type: 'text', sortable: true },
    { label: "Date", fieldName: "recordDate", type: "date",
        typeAttributes: {
            year: "numeric",
            month: "long",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: 'Asia/Kathmandu'
        },
        sortable: true
    },
    { label: 'Obtained Marks', fieldName: 'obtainedMarks', type: 'number', cellAttributes: { alignment: 'left' } },
    { label: 'Admin Approval', fieldName: 'adminApproved', type: 'text', sortable: true },
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
    @track searchTerm = '';
    @track filteredData = [];
    @track paginatedData = [];
    @track sortedBy;
    @track sortDirection = 'asc';

    @track pageSize = 10; // Number of records per page
    @track currentPage = 1;
    @track totalPages = 0;

    // retrieves candidateResponse values and bind in data variable
    @wire(getExamData)
    wiredExams(result) {
        if (result.data) {
            this.data = result.data.map(row => {
                return {
                    ...row,
                    obtainedMarks: row.obtainedMarks,
                    adminApproved: row.adminApproved,
                    status: row.passStatus,
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

    // gets called when users clicks 'View Details' button
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
        this.filteredData = this.data.filter(record => {
            const assignTo = record.assignTo ? record.assignTo.toLowerCase() : '';
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
                   adminApproved.includes(searchTerm) ||
                   status.includes(searchTerm) ||
                   recordDate.includes(searchTerm) ||
                   recordDateWithoutSpaces.includes(searchTerm);
        });

        this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        this.updatePaginatedData();
    }

    updatePaginatedData() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.paginatedData = this.filteredData.slice(start, end);
    }

    handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePaginatedData();
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePaginatedData();
        }
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
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
            ? function (x) {
                return primer(x[field]);
            }
            : function (x) {
                return x[field];
            };

        reverse = reverse === 'asc' ? 1 : -1;

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }
}
