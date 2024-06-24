import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';
import saveCandidateResponse from '@salesforce/apex/SQX_examController.saveCandidateResponse';
import { LightningElement, track, wire } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;
    @track userAnswers = [];

    examId;

    @wire(getAssignedQuestions)
    wiredExams({ error, data }) {
        if (data) {
            this.exams = data.map((exam, idx) => {
                const questionOptions = exam.Question_Options ? exam.Question_Options.split('/') : [];
                return {
                    ...exam,
                    Question_Title: cleanQuestionString(exam.Question_Title),
                    isMCQ: exam.Question_Type === 'MCQ',
                    isMultiple_Select_MCQ: exam.Question_Type === 'Multiple Select MCQ',
                    isFreeEnd: exam.Question_Type === 'Free End',
                    questionOptions: questionOptions.map((option, index) => ({
                        value: option,
                        label: `Option ${String.fromCharCode(65 + index)}` // Assigning labels Option A, Option B, ...
                    })),
                    correctAnswer: exam.Correct_Answer ? exam.Correct_Answer.split(',') : [],
                    selectedOption: null,
                    selectedOptions: [],
                    userAnswer: '',
                    number: idx + 1
                };
            });
            this.examId = data[0].Id;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.exams = [];
        }
    }

    handleOptionChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const option = event.target.value;
        const isChecked = event.target.checked;

        this.exams = this.exams.map((exam, index) => {
            if (index === questionNumber - 1) {
                if (exam.isMCQ) {
                    return { ...exam, selectedOption: option };
                } else if (exam.isMultiple_Select_MCQ) {
                    const updatedOptions = isChecked
                        ? [...exam.selectedOptions, option]
                        : exam.selectedOptions.filter(item => item !== option);
                    return { ...exam, selectedOptions: updatedOptions };
                }
            }
            return exam;
        });
    }

    handleAnswerChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const answer = event.target.value;

        this.exams = this.exams.map(exam => {
            if (exam.number === questionNumber) {
                return { ...exam, userAnswer: answer };
            }
            return exam;
        });
    }

    handleSubmit() {
        this.userAnswers = this.exams.map(exam => ({
            questionId: exam.QuestionId,
            questionNumber: exam.number,
            answer: exam.isMCQ
                ? exam.questionOptions.find(opt => opt.value === exam.selectedOption)?.label
                : exam.isMultiple_Select_MCQ
                    ? exam.selectedOptions
                        .map(option => exam.questionOptions.find(opt => opt.value === option)?.label)
                        .sort() // Sorting the selected options alphabetically
                        .join(', ')
                    : exam.userAnswer
        }));

        saveCandidateResponse({ userAnswers: JSON.stringify(this.userAnswers), examId: this.examId })
            .then(result => {
                console.log('Answers submitted successfully:', result);
                this.updateAnswerStyles();
            })
            .catch(error => {
                console.error('Error submitting answers:', error);
            });
    }

    updateAnswerStyles() {
        this.exams = this.exams.map(exam => {
            const userAnswer = this.userAnswers.find(ans => ans.questionId === exam.QuestionId);

            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                const userAnswerArray = userAnswer ? userAnswer.answer.split(', ') : [];

                exam.questionOptions = exam.questionOptions.map(option => {
                    const isCorrect = exam.correctAnswer.includes(option.label);
                    const isSelected = userAnswerArray.includes(option.label);
                    const optionClass = isCorrect ? 'slds-text-color_success' : isSelected ? 'slds-text-color_error' : '';

                    return {
                        ...option,
                        optionClass
                    };
                });
            }
            return exam;
        });
    }

    get numberedExams() {
        return this.exams;
    }
}

function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    return tempElement.textContent || tempElement.innerText || '';
}
