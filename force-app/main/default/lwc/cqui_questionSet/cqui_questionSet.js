import createQuestionSet from '@salesforce/apex/SQX_questionSetController.createQuestionSet';
import getQuestions from '@salesforce/apex/SQX_questionSetController.getQuestions';
import getSetPicklistValues from '@salesforce/apex/SQX_questionSetController.getSetPicklistValues';
import alreadyExistQuestions from '@salesforce/apex/SQX_questionSetController.alreadyExistQuestions';
import ANSWER_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Correct_Answer__c';
import OPTIONS_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Options__c';
import TITLE_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Title__c';
import TYPE_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Type__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, wire, track } from 'lwc';

const COLUMNS = [
    { label: 'Title', fieldName: TITLE_FIELD.fieldApiName },
    { label: 'Type', fieldName: TYPE_FIELD.fieldApiName },
    { label: 'Answer', fieldName: ANSWER_FIELD.fieldApiName },
    { label: 'Options', fieldName: OPTIONS_FIELD.fieldApiName },
];

function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    let cleanText = tempElement.textContent || tempElement.innerText || '';
    cleanText = cleanText.replace(/&quot;/g, '"');
    return cleanText;
}

export default class CquiQuestionSet extends LightningElement {
    @track displayedQuestions = [];
    @track allSelectedQuestionIds = [];
    @track setPicklistValues = [];
    @track questions = [];
    @track originalQuestions = []; // Store the original questions list
    @track questionCount = 0;
    selectedQuestionsByPage = {};
    setName = '';
    page = 1;
    questionPerPage = 7;
    columns = COLUMNS;
    searchTerm = '';
    error;
    @track isSetSelected = false; // Flag to manage question display

    @wire(getQuestions)
    wiredQuestions({ error, data }) {
        if (data) {
            this.originalQuestions = data.map(record => {
                return {
                    Id: record.Id,
                    SQX_Title__c: cleanQuestionString(record.SQX_Title__c),
                    SQX_Type__c: record.SQX_Type__c,
                    SQX_Options__c: record.SQX_Options__c,
                    SQX_Correct_Answer__c: record.SQX_Correct_Answer__c
                };
            });
            if (this.isSetSelected) { // Only set questions if a set is selected
                this.questions = [...this.originalQuestions];
                this.updateTotalPages();
                this.updateDisplayedQuestions();
            }
        } else if (error) {
            console.error('Error:', error);
        }
    }



    handleSearchTermChange(event) {
        this.searchTerm = event.target.value.toLowerCase().trim();
        this.page = 1; // Reset to first page on new search
        this.updateTotalPages();
        this.updateDisplayedQuestions();
    }
    
    @wire(getSetPicklistValues)
    wiredSetPicklistValues({ error, data }) {
        if (data) {
            const uniqueValues = new Set();
            data.forEach(value => {
                uniqueValues.add(value.SQX_Name__c);
            });

            this.setPicklistValues = Array.from(uniqueValues).map(label => ({
                label: label,
                value: data.find(item => item.SQX_Name__c === label).Id // Assuming Id is unique per label
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.setPicklistValues = [];
        }
    }

    updateDisplayedQuestions() {
        const searchTerm = this.searchTerm.trim().toLowerCase();
        const filteredQuestions = this.questions.filter(record =>
            record.SQX_Title__c.trim().toLowerCase().includes(searchTerm) ||
            record.SQX_Type__c.trim().toLowerCase().includes(searchTerm)
        );
        const startIndex = (this.page - 1) * this.questionPerPage;
        const endIndex = startIndex + this.questionPerPage;
        this.displayedQuestions = filteredQuestions.slice(startIndex, endIndex);
    }

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        const selectedIds = selectedRows.map(row => row.Id);
        this.selectedQuestionsByPage[this.page] = selectedIds;
        const allSelectedIds = Object.keys(this.selectedQuestionsByPage).reduce((acc, page) => {
            return acc.concat(this.selectedQuestionsByPage[page]);
        }, []);
        this.allSelectedQuestionIds = [...new Set(allSelectedIds)];
    }

    async handleCreateQuestionSet() {
        if (!this.validateSetName()) {
            return;
        }
        await createQuestionSet({
            setName: this.setName,
            questionIds: this.allSelectedQuestionIds
        }).then(() => {
            this.showToast('Success', 'Question Set Creation successful', 'success');
            this.isSetSelected = true; // Set flag to true after successful creation
            this.retrieveNonExistQuestion(); // Re-fetch and update questions
            location.reload();
        }).catch((error) => {
            var errorMessage = error.body.message;
            var customErrorMessage;
            if (errorMessage.length > 40) {
                customErrorMessage = errorMessage.split(':')[2].trim().split(',')[1].trim();
            } else {
                customErrorMessage = errorMessage;
            }
            this.showToast('Failure', customErrorMessage, 'error');
        });
    }

    validateSetName() {
        const combobox = this.template.querySelector('lightning-combobox');
        if (!this.setName) {
            combobox.setCustomValidity('Set Name is required');
            combobox.reportValidity();
            return false;
        } else {
            combobox.setCustomValidity('');
            combobox.reportValidity();
            return true;
        }
    }

    handleSetNameChange(event) {
        this.setName = event.target.value;
        this.isSetSelected = false; // Reset flag when set name changes
        this.retrieveNonExistQuestion();
    }
    
    async retrieveNonExistQuestion() {
        const already = await alreadyExistQuestions({ setName: this.setName });
        const alreadyIds = new Set(already.map(q => q.SQX_Question__c)); // Creates new set where only the ids are there from the Map (stored in key-value pairs)
        this.questionCount = alreadyIds.size; // Get the count of unique IDs in the Set
        this.questions = this.originalQuestions.filter(quest => !alreadyIds.has(quest.Id)); // Filter from the original questions list
        this.updateTotalPages();
        this.updateDisplayedQuestions();
    }

    handlePageChange(event) {
        const direction = event.target.dataset.direction;
        if (direction === 'previous' && this.page > 1) {
            this.page -= 1;
        } else if (direction === 'next' && this.page < this.totalPages) {
            this.page += 1;
        }
        this.updateDisplayedQuestions();
        if (!this.selectedQuestionsByPage[this.page]) {
            this.selectedQuestionsByPage[this.page] = [];
        }
        this.allSelectedQuestionIds = [...this.selectedQuestionsByPage[this.page]];
    }

    updateTotalPages() {
        const searchTerm = this.searchTerm.trim().toLowerCase();
        const filteredQuestions = this.questions.filter(record =>
            record.SQX_Title__c.trim().toLowerCase().includes(searchTerm) ||
            record.SQX_Type__c.trim().toLowerCase().includes(searchTerm)
        );
        this.totalPages = Math.ceil(filteredQuestions.length / this.questionPerPage);
    }

    get totalPages() {
        return this._totalPages || 1;
    }
    set totalPages(value) {
        this._totalPages = value;
    }

    get isCreateButtonEnabled() {
        const isSetNameSelected = this.setName !== '';
        const isQuestionSelected = Object.values(this.selectedQuestionsByPage).some(pageQuestions => pageQuestions.length > 0);
        return isSetNameSelected && isQuestionSelected;
    }

    get isFirstPage() {
        return this.page === 1;
    }

    get isLastPage() {
        return this.page === this.totalPages;
    }

    get isMoreThanOnePage() {
        return this.totalPages > 1 && this.displayedQuestions.length > 0;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }

    resetState() {
        this.displayedQuestions = [];
        this.allSelectedQuestionIds = [];
        this.selectedQuestionsByPage = {};
        this.setName = '';
        this.searchTerm = '';
        this.page = 1;
        this.isSetSelected = false; // Reset the flag for set selection
        this.questions = [...this.originalQuestions]; // Reset to original questions list
        this.updateTotalPages();
        this.updateDisplayedQuestions();
    }
}

