import { LightningElement } from 'lwc';

const COLUMNS = [
    { label: '', type: 'checkbox', fieldName: 'isChecked' },
    { label: 'Title', fieldName: 'title' },
    { label: 'Type', fieldName: 'type' },
    { label: 'Answer', fieldName: 'answer' },
    { label: 'Options', fieldName: 'options' },
];

const SET_NAME = [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }]

export default class Cqui_questionSet extends LightningElement {
    questions = [{ id: '1', 'title': 'What is your name', 'type': 'free-end' }, { id: '2', 'title': 'What is your name', 'type': 'free-end' }];

    selectedQuestions = new Set();
    setName = '';
    page = 1;
    pageSize = 5;
    totalPages = 1;
    columns = COLUMNS;

    get options() {
        return SET_NAME;
    }

    get isPreviousDisabled() {
        return this.page === 1;
    }
    get isNextDisabled() {
        return this.page === this.totalPages;
    }

    handleCheckboxChange(event) {
        const questionId = event.target.value;
        if (event.target.checked) {
            this.selectedQuestions.add(questionId);
        } else {
            this.selectedQuestions.delete(questionId);
        }
        this.disableSubmit = this.selectedQuestions.size === 0;
    }

    handleSetNameChange(event) {
        this.setName = event.target.value;
    }

    handleCheckboxChange(event) {
        console.log("handle checkbox");
        const questionId = event.detail.value;
        const checked = event.detail.checked;
        console.log("Question id::::", questionId);
        if (checked) {
            this.selectedQuestions.add(questionId);
        } else {
            this.selectedQuestions.delete(questionId);
        }

        this.questions = this.questions.map(question => ({
            ...question,
            isChecked: this.selectedQuestions.has(question.id)
        }));

        this.disableSubmit = this.selectedQuestions.size === 0;
    }
}