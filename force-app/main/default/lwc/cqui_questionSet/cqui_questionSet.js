import { LightningElement } from 'lwc';

const COLUMNS = [
    { label: 'Title', fieldName: 'title' },
    { label: 'Type', fieldName: 'type' },
    { label: 'Answer', fieldName: 'answer' },
    { label: 'Options', fieldName: 'options' },
];

const QUESTIONS = [
    { id: '1', title: 'What is your favorite feature in Salesforce?', type: 'free-end' },
    { id: '2', title: 'Describe your experience with Salesforce Lightning.', type: 'free-end' },
    { id: '3', title: 'How do you handle data migration in Salesforce?', type: 'free-end' },
    { id: '4', title: 'What is your approach to building custom applications on the Salesforce platform?', type: 'free-end' },
    { id: '5', title: 'How do you manage security and access control in Salesforce?', type: 'free-end' },
    { id: '6', title: 'Explain your experience with Salesforce integrations.', type: 'free-end' },
    { id: '7', title: 'What are your thoughts on Salesforce certifications?', type: 'free-end' },
    { id: '8', title: 'How do you troubleshoot and debug issues in Salesforce?', type: 'free-end' },
    { id: '9', title: 'Describe your understanding of Salesforce automation tools like Process Builder and Flow.', type: 'free-end' },
    { id: '10', title: 'What are the benefits of using Salesforce as a CRM platform?', type: 'free-end' },
    { id: '11', title: 'How do you stay updated with the latest Salesforce releases and features?', type: 'free-end' },
    { id: '12', title: 'Share an example of a successful Salesforce implementation project you have worked on.', type: 'free-end' },
    { id: '13', title: 'What challenges have you faced while working with Salesforce, and how did you overcome them?', type: 'free-end' },
    { id: '14', title: 'Describe your experience with Salesforce Communities and how you leverage them for collaboration.', type: 'free-end' },
    { id: '15', title: 'How do you ensure data quality and cleanliness in Salesforce?', type: 'free-end' },
    { id: '16', title: 'Explain your experience with Salesforce DX and source-driven development.', type: 'free-end' },
    { id: '17', title: 'What is your strategy for user adoption and training when implementing Salesforce?', type: 'free-end' },
    { id: '18', title: 'How do you approach Salesforce governance and best practices?', type: 'free-end' },
    { id: '19', title: 'What are the key metrics you track in Salesforce to measure business performance?', type: 'free-end' },
    { id: '20', title: 'Describe your experience with Salesforce Lightning Web Components (LWC) and Aura components.', type: 'free-end' },
    { id: '21', title: 'How do you handle large volumes of data in Salesforce, and what techniques do you use for performance optimization?', type: 'free-end' },
    { id: '22', title: 'What is the capital of France?', type: 'singlechoice', options: ['Paris', 'Berlin', 'London', 'Rome'] },
    { id: '23', title: 'Which of the following is a programming language?', type: 'multichoice', options: ['HTML', 'CSS', 'JavaScript', 'Photoshop'] }
];

const SET_NAME = [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }];

export default class CquiQuestionSet extends LightningElement {
    questions = QUESTIONS;
    displayedQuestions = [];
    selectedQuestions = [];
    setName = '';
    page = 1;
    questionPerPage = 7;
    totalPages = 1;
    columns = COLUMNS;
    errorMessage = '';

    selectedQuestionsByPage = {};

    connectedCallback() {
        this.totalPages = Math.ceil(this.questions.length / this.questionPerPage);
        this.updateDisplayedQuestions();
        this.initializeSelectedQuestions();
    }

    //// updates the list of questions currently displayed on the page
    updateDisplayedQuestions() {
        const start = (this.page - 1) * this.questionPerPage;
        const end = this.page * this.questionPerPage;
        this.displayedQuestions = this.questions.slice(start, end);
    }

    //// tracks which questions are selected on each page.
    initializeSelectedQuestions() {
        for (let i = 1; i <= this.totalPages; i++) {
            this.selectedQuestionsByPage[i] = [];
        }
    }

    //// triggers when row is selected
    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        const currentPageSelectedQuestions = this.selectedQuestionsByPage[this.page];

        // console.log("selectedRows::: ", JSON.stringify(selectedRows));
        // console.log("currentPageSelectedQuestions:::: ", JSON.stringify(currentPageSelectedQuestions));
        currentPageSelectedQuestions.length = 0;

        //// Add the selected question IDs to the array
        selectedRows.forEach(row => {
            if (row.id) {
                currentPageSelectedQuestions.push(row.id);
            }
        });

        // Update the main selectedQuestions array with the current page's selected questions
        this.selectedQuestions = [...currentPageSelectedQuestions];

    }

    //// triggers when create question btn is clicked
    handleCreateQuestionSet(event) {
        if (!this.validateSetName()) {
            return;
        }
        let selectedQuestions = [];
        // Iterate through selected questions on each page and concatenate them
        Object.values(this.selectedQuestionsByPage).forEach(selectedQuestionsPage => {
            selectedQuestions = selectedQuestions.concat(selectedQuestionsPage);
        });
        alert("Selected Questions: " + selectedQuestions.join(', ') + " set :: " + this.setName);
    }

    //// checks whether setName is selected or not
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

    //// saves setName
    handleSetNameChange(event) {
        this.setName = event.target.value;
    }

    //// handles pagination logic
    handlePageChange(event) {
        const direction = event.target.dataset.direction;
        if (direction === 'previous' && this.page > 1) {
            this.page -= 1;
        } else if (direction === 'next' && this.page < this.totalPages) {
            this.page += 1;
        }
        this.updateDisplayedQuestions();
        this.selectedQuestions = [...this.selectedQuestionsByPage[this.page]];
    }

    get options() {
        return SET_NAME;
    }

    //// condition for making create question btn enable
    get isCreateButtonEnabled() {
        const isSetNameSelected = this.setName !== '';
        const isQuestionSelected = Object.values(this.selectedQuestionsByPage).some(pageQuestions => pageQuestions.length > 0);
        return isSetNameSelected && isQuestionSelected;
    }


    get selectedQuestionsArray() {
        return this.selectedQuestions;
    }

    //// renders question of all types
    get renderedQuestions() {
        return this.displayedQuestions.map(question => {
            const { options, ...rest } = question;
            if (options) {
                return {
                    ...rest,
                    options: options.join(', ')
                };
            }
            return question;
        });
    }
}
