import getAssignedQuestions from '@salesforce/apex/SQX_RetrieveExamController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_RetrieveExamController.getCandidateResponse';

import { LightningElement, api, track } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [''];
    @track error;
    @track userAnswers = [];
    @track isSubmitted = false;
    @track showModal = false;
    obtainedMarks = 0;
    examId;
    setName = '';
    fullMarks = '';
    passMarks = '';
    @api recordId;
    
    connectedCallback() {
        this.loadExamData()
            .then(() => this.loadCandidateResponse())
            .then(() => this.updateAnswerStyles())
            .catch(error => {
                console.error("Error in connectedCallback:: " + JSON.stringify(error));
                this.error = error;
            });
    }

    loadExamData() {
        return getAssignedQuestions({ recordId: this.recordId })
            .then(result => {
                this.setName = result[0].Set_Name;
                this.fullMarks = result[0].Full_Marks;
                this.passMarks = result[0].Pass_Marks;
                if (result && result.length > 0) {
                    this.exams = result.map((exam, idx) => {
                        const questionOptions = exam.Question_Options ? exam.Question_Options.split('/') : [];
                        return {
                            ...exam,
                            Question_Title: cleanQuestionString(exam.Question_Title),
                            isMCQ: exam.Question_Type === 'MCQ',
                            isMultiple_Select_MCQ: exam.Question_Type === 'Multiple Select MCQ',
                            isFreeEnd: exam.Question_Type === 'Free End',
                            questionOptions: questionOptions.map((option, index) => ({
                                value: option,
                                label: `Option ${String.fromCharCode(65 + index)}`
                            })),
                            correctAnswer: exam.Correct_Answer ? exam.Correct_Answer.split(',') : [],
                            selectedOption: '',
                            selectedOptions: [],
                            userAnswer: '',
                            number: idx + 1
                        };
                    });
                    this.examId = result[0].Id;
                    this.error = undefined;
                } else {
                    this.error = { message: 'No exams found.' };
                }
            })
            .catch(error => {
                console.error("Error fetching questions:: " + JSON.stringify(error));
                this.error = error;
                this.exams = [];
            });
    }

    loadCandidateResponse() {
        return getCandidateResponse({ recordId: this.recordId })
            .then(result => {
                console.log("Candidate result::: " + JSON.stringify(result));
                const parsedResult = JSON.parse(result);
                this.userAnswers = parsedResult;
            })
            .catch(error => {
                console.error("Error fetching candidate response:: " + JSON.stringify(error));
            });
    }

    getExamOptionChecked(exam, option) {
        return exam.selectedOption === option.value;
    }

    closeModal() {
        this.showModal = false;
    }

    updateAnswerStyles() {
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});
        console.log("userAnswersMap:::" + JSON.stringify(userAnswersMap));
    
        const filteredExams = this.exams.filter(exam => userAnswersMap.hasOwnProperty(exam.number));
    
        this.exams = filteredExams.map(exam => {
            const userAnswer = userAnswersMap[exam.number];
            console.log("userAnswer:::" + JSON.stringify(userAnswer));

            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                exam.questionOptions = exam.questionOptions.map(option => {
                    const isCorrect = exam.correctAnswer.includes(option.label);
                    const isSelected = exam.isMCQ
                        ? userAnswer === option.label
                        : userAnswer.split(', ').includes(option.label);
                    let optionClass = 'default-option';
                    if (isSelected) {
                        optionClass = isCorrect ? 'correct-answer' : 'incorrect-answer';
                    } else if (userAnswer === '' && isCorrect) {
                        optionClass = 'unattempted-correct-answer';
                    } else if (isCorrect) {
                        optionClass = 'correct-answer';
                    }
                    return {
                        ...option,
                        optionClass
                    };
                });
            } else if (exam.isFreeEnd) {
                exam.userAnswer = userAnswer;
            }

            return exam;
        });
    }

    get numberedExams() {
        return this.exams;
    }
}

function cleanQuestionString(question) {
    return question.replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n');
}
