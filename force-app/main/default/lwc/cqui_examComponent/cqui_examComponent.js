
import { LightningElement, wire, track } from 'lwc';
import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';

export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;

    @wire(getAssignedQuestions)
    wiredExams({ error, data }) {
        console.log('data:::'+JSON.stringify(data));
        if (data) {
            this.exams = data.map(exam => {
                return {
                    ...exam,
                    Question_Title:cleanQuestionString(exam.Question_Title),
                    isMCQ: exam.Question_Type === 'MCQ',
                    isMultiple_Select_MCQ: exam.Question_Type === 'Multiple Select MCQ',
                    isFreeEnd: exam.Question_Type === 'Free End',
                    questionOptions: exam.Question_Options ? exam.Question_Options.split('/') : [], // Split options if they are in a string format
                    selectedOptions: [] // Initialize selected options array
                };
            });
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.exams = [];
        }
    }
    
    handleOptionChange(event) {
        const questionId = event.target.dataset.id;
        const option = event.target.dataset.option;
        const isChecked = event.target.checked;
    
        // Update the selected options for the specific question
        this.exams = this.exams.map(exam => {
            if (exam.Id === questionId) {
                let selectedOptions = exam.selectedOptions.slice(); // Create a copy of the array
                if (isChecked) {
                    selectedOptions.push(option); // Add the selected option
                } else {
                    selectedOptions = selectedOptions.filter(item => item !== option); // Remove the deselected option
                }
                return { ...exam, selectedOptions };
            }
            return exam;
        });
    }

    handleAnswerChange(event) {
        const questionId = event.target.dataset.id;
        const answer = event.target.value;

        // Update the userAnswer for the specific question
        this.exams = this.exams.map(exam => {
            if (exam.Id === questionId) {
                return { ...exam, userAnswer: answer };
            }
            return exam;
        });
    }
    get numberedExams() {
        if (!this.exams) return [];
        return this.exams.map((exam, idx) => ({ ...exam, number: idx + 1 }));
      }
}
// removes html tags, convert &quot into double quotation   
function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    let cleanText = tempElement.textContent || tempElement.innerText || '';
    cleanText = cleanText.replace(/&quot;/g, '"');
    return cleanText;
}
