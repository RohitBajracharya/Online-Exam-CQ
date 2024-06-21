import createQuestionSet from '@salesforce/apex/SQX_questionSetController.createQuestionSet';
import getQuestions from '@salesforce/apex/SQX_questionSetController.getQuestions';
import getSetPicklistValues from '@salesforce/apex/SQX_questionSetController.getSetPicklistValues';
import ANSWER_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Correct_Answer__c';
import OPTIONS_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Options__c';
import TITLE_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Title__c';
import TYPE_FIELD from '@salesforce/schema/SQX_Question__c.SQX_Type__c';
import  NAME_FIELD from '@salesforce/schema/SQX_Question__c.Name';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, wire, track } from 'lwc';



const COLUMNS = [
    
    { 
        label: 'Question Name',
        fieldName: 'recordLink',
        type: 'url',
        typeAttributes: {  
            label: {
                fieldName: NAME_FIELD.fieldApiName
            },
            target: '_self'
        }
    },
    { label: 'Title', fieldName: TITLE_FIELD.fieldApiName },
    { label: 'Type', fieldName: TYPE_FIELD.fieldApiName },
    { label: 'Answer', fieldName: ANSWER_FIELD.fieldApiName },
    { label: 'Options', fieldName: OPTIONS_FIELD.fieldApiName },
];

// removes html tags, convert &quot into double quotation   
function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    let cleanText = tempElement.textContent || tempElement.innerText || '';
    cleanText = cleanText.replace(/&quot;/g, '"');
    return cleanText;
}

export default class CquiQuestionSet extends LightningElement {
    displayedQuestions = [];
    allSelectedQuestionIds = [];
    @track setPicklistValues = [];
    @track questions = [];
    selectedQuestionsByPage = {};
    setName = '';
    page = 1;
    questionPerPage = 7;
    totalPages = 1;
    columns = COLUMNS;
    error;

    // retrieves questions record by calling method from controller and stores in questions array after cleaning the title, calculates totalPages and updates the questions that needs to be displayed in every page
    @wire(getQuestions)
    wiredQuestions({ error, data }) {
        if (data) {
            this.questions = data.map(record => {
                return {
                    Id: record.Id,
                    Name: record.Name,
                    recordLink: '/' + record.Id,
                    SQX_Title__c: cleanQuestionString(record.SQX_Title__c),
                    SQX_Type__c: record.SQX_Type__c,
                    SQX_Options__c: record.SQX_Options__c,
                    SQX_Correct_Answer__c: record.SQX_Correct_Answer__c
                };
            });
            if (this.questions.length < 7) {
                this.questionPerPage = this.questions.length;
            }
            this.totalPages = Math.ceil(this.questions.length / this.questionPerPage);
            this.updateDisplayedQuestions();
        } else if (error) {
            console.error('Error:', error);
        }
    }

    // retrieves picklist value by calling method from controller and stores in setPicklistValuse array
    @wire(getSetPicklistValues)
    wiredSetPicklistValues({ error, data }) {
        console.log('set:::',JSON.stringify(data));
        if (data) {
            // Use a Set to remove duplicates based on value.SQX_Name__c
            const uniqueValues = new Set();
            data.forEach(value => {
                uniqueValues.add(value.SQX_Name__c);
            });

            // Convert Set back to an array of objects for picklist options
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

    // method that decides which questions are needed to be displayed on each pages of the table
    updateDisplayedQuestions() {
        const startIndex = (this.page - 1) * this.questionPerPage;
        const endIndex = startIndex + this.questionPerPage;
        this.displayedQuestions = this.questions.slice(startIndex, endIndex);
    }

    // method that saves selected Question Ids and maintained this record across all pages of table
    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        const selectedIds = selectedRows.map(row => row.Id);
        this.selectedQuestionsByPage[this.page] = selectedIds;
        const allSelectedIds = Object.keys(this.selectedQuestionsByPage).reduce((acc, page) => {
            return acc.concat(this.selectedQuestionsByPage[page]);
        }, []);
        this.allSelectedQuestionIds = [...new Set(allSelectedIds)];
    }

    //method that validates if setName is selected or not, then inserts selected QuestionIds in SQX_Question_Set__c object and show corresponding success or error toast.
    async handleCreateQuestionSet(event) {
        if (!this.validateSetName()) {
            return;
        }
        await createQuestionSet({
            setName: this.setName,
            questionIds: this.allSelectedQuestionIds
        }).then(() => {
            this.showToast('Success', 'Question Set Creation successful', 'success');
            this.resetState();
        }).catch((error) => {
            var errorMessage = error.body.message;
            var customErrorMessage;
            if (errorMessage.length > 40) {
                customErrorMessage = errorMessage.split(':')[2].trim().split(',')[1].trim();

            } else {
                customErrorMessage = errorMessage;
            }
            this.showToast('Failure', customErrorMessage, 'Error');
        });
    }

    // validates whether setName is selected or not
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

    // stores user selected SetName in setName variable
    handleSetNameChange(event) {
        this.setName = event.target.value;
    }

    //handles pagination and stores selectedIds across all pages of table
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

    // condition that checks both setName and atleast one question is selected or not
    get isCreateButtonEnabled() {
        const isSetNameSelected = this.setName !== '';
        const isQuestionSelected = Object.values(this.selectedQuestionsByPage).some(pageQuestions => pageQuestions.length > 0);
        return isSetNameSelected && isQuestionSelected;
    }

    //checks if it is first page of the table or not
    get isFirstPage() {
        return this.page === 1;
    }

    //checks if it is last page of the table or not
    get isLastPage() {
        return this.page === this.totalPages;
    }

    //checks if there are more than one page
    get isMoreThanOnePage() {
        return this.totalPages > 1 && this.displayedQuestions.length > 0;
    }

    // utilitity function to show success or error toast
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }

    // reset all variables values
    resetState() {
        this.displayedQuestions = [];
        this.allSelectedQuestionIds = [];
        this.selectedQuestionsByPage = {};
        this.setName = '';

        this.updateDisplayedQuestions();
    }
}
