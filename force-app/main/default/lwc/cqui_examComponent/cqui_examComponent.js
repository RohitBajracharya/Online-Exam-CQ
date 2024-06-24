import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';
import { LightningElement, track, wire } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;
    @track userAnswers = [];

    @wire(getAssignedQuestions)
    wiredExams({ error, data }) {
        console.log('data:::' + JSON.stringify(data));
        if (data) {
            this.exams = data.map((exam, idx) => {
                return {
                    ...exam,
                    Question_Title: cleanQuestionString(exam.Question_Title),
                    isMCQ: exam.Question_Type === 'MCQ',
                    isMultiple_Select_MCQ: exam.Question_Type === 'Multiple Select MCQ',
                    isFreeEnd: exam.Question_Type === 'Free End',
                    questionOptions: exam.Question_Options ? exam.Question_Options.split('/') : [], // Split options if they are in a string format
                    selectedOptions: [], // Initialize selected options array
                    number: idx + 1 // Add the question number
                };
            });

            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.exams = [];
        }
    }

    handleOptionChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const questionId = event.target.dataset.id;
        const option = event.target.value;
        const isChecked = event.target.checked;

        this.exams = this.exams.map(exam => {
            if (exam.number === questionNumber) {
                let selectedOptions = exam.isMultiple_Select_MCQ ? exam.selectedOptions.slice() : []; // For single-select MCQs, reset selected options
                if (isChecked) {
                    if (exam.isMultiple_Select_MCQ) {
                        selectedOptions.push(option);
                    } else {
                        selectedOptions = [option]; // For single-select MCQs, replace the entire array with the selected option
                    }
                } else {
                    selectedOptions = selectedOptions.filter(item => item !== option);
                }
                if (exam.isMultiple_Select_MCQ) {
                    selectedOptions = this.sortOptionsByUIOrder(exam.questionOptions, selectedOptions);
                }
                this.updateUserAnswers(questionId, questionNumber, selectedOptions);
                return { ...exam, selectedOptions };
            }
            return exam;
        });
    }

    handleAnswerChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const questionId = event.target.dataset.id;
        const answer = event.target.value;

        this.updateUserAnswers(questionId, questionNumber, answer);

        this.exams = this.exams.map(exam => {
            if (exam.number === questionNumber) {
                return { ...exam, userAnswer: answer };
            }
            return exam;
        });
    }

    updateUserAnswers(questionId, questionNumber, answer) {
        const existingAnswerIndex = this.userAnswers.findIndex(ans => ans.questionNumber === questionNumber);
        if (existingAnswerIndex > -1) {
            this.userAnswers[existingAnswerIndex].answer = answer;
        } else {
            this.userAnswers.push({ questionId, questionNumber, answer });
        }

        // Sort userAnswers by questionNumber
        this.userAnswers.sort((a, b) => a.questionNumber - b.questionNumber);

        console.log('Updated userAnswers:', JSON.stringify(this.userAnswers));
    }

    sortOptionsByUIOrder(originalOptions, selectedOptions) {
        return selectedOptions.sort((a, b) => originalOptions.indexOf(a) - originalOptions.indexOf(b));
    }

    get numberedExams() {
        if (!this.exams) return [];
        return this.exams;
    }
}

function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    let cleanText = tempElement.textContent || tempElement.innerText || '';
    cleanText = cleanText.replace(/&quot;/g, '"');
    return cleanText;
}
