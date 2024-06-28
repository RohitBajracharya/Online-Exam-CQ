import getAssignedQuestions from '@salesforce/apex/SQX_RetrieveExamController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_RetrieveExamController.getCandidateResponse';

import { LightningElement, track, api } from 'lwc';

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
       
        getAssignedQuestions({recordId:this.recordId})
            .then(result => {
                this.setName = result[0].Set_Name;
                this.fullMarks = result[0].Full_Marks;
                this.passMarks = result[0].Pass_Marks;
                // console.log("result::: "+JSON.stringify(result));
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
                console.error("error fetching questions:: "+JSON.stringify(error));
                this.error = error;
                this.exams = [];
            });
            this.loadCandidateResponse();
    }


    loadCandidateResponse() {
        console.log("candidate:: "+JSON.stringify(this.exams));
        getCandidateResponse({ recordId: this.recordId })
            .then(result => {
                console.log("candidate result::: "+JSON.stringify(result));
                const parsedResult = JSON.parse(result);
                this.userAnswers = parsedResult;
                this.updateAnswerStyles();
            })
            .catch(error => {
                console.error("Error fetching candidate Response:: "+JSON.stringify(error));
            });
    }



    getExamOptionChecked(exam, option) {
        return exam.selectedOption === option.value;
    }

    closeModal() {
        this.showModal = false;
    }

    updateAnswerStyles() {
        // First, map the user answers to question IDs for easy lookup
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});
        console.log("userAnswersMap:::" + JSON.stringify(userAnswersMap));
    
        // Filter the exams array to include only exams that have user answers
        const filteredExams = this.exams.filter(exam => userAnswersMap.hasOwnProperty(exam.number));
    
        // Update the exams array with proper option classes and user answers
        this.exams = filteredExams.map(exam => {
            const userAnswer = userAnswersMap[exam.number];
            console.log("userAnswer:::" + JSON.stringify(userAnswer));
    
            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                // Update options with classes for MCQ and Multiple Select MCQ
                exam.questionOptions = exam.questionOptions.map(option => {
                    // Determine if this option is the correct answer
                    const isCorrect = exam.correctAnswer.includes(option.label);
    
                    // Determine if the user selected this option
                    const isSelected = exam.isMCQ
                        ? userAnswer === option.label
                        : userAnswer.split(', ').includes(option.label); // Handle multiple selections
    
                    // Determine the option class based on selection and correctness
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
