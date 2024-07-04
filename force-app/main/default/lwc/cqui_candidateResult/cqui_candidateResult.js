import getAssignedQuestions from '@salesforce/apex/SQX_RetrieveExamController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_RetrieveExamController.getCandidateResponse';
import getObtainMarksEditPermission from '@salesforce/apex/SQX_RetrieveExamController.getObtainMarksEditPermission';
import updateCandidateResponseApproval from '@salesforce/apex/SQX_RetrieveExamController.updateCandidateResponseApproval';
import updateExamObjectApex from '@salesforce/apex/SQX_RetrieveExamController.updateExamObjectApex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { LightningElement, api, track } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [''];
    @track error;
    @track userAnswers = [];
    @track isSubmitted = false;
    @track showModal = false;
    editedFinalMarks = 0;
    obtainedMarks = 0;
    examId;
    setName = '';
    fullMarks = '';
    passMarks = '';
    @api recordId;
    finalMarks;
    noOfFreeEnd = 0;
    totalNoOfQuestion = 0;
    hasObtainedMarksPermission = false;
    perQuestionMarks;
    totalFreeEndMarks;

    async connectedCallback() {
        // checks whether user have permission to give final marks to candidate
        getObtainMarksEditPermission()
            .then(result => {
                const res = JSON.stringify(result);
                if (res == 'true') {
                    this.hasObtainedMarksPermission = true;
                }
            })
            .catch(error => console.error("error::" + JSON.stringify(error)));

        //retrieves assigned question, candidate response and bind assigned questions and candidate response
        this.loadExamData()
            .then(() => this.loadCandidateResponse())
            .then(() => this.updateAnswerStyles())
            .catch(error => {
                console.error("Error in connectedCallback:: " + JSON.stringify(error));
                this.error = error;
            });
    }


    async loadExamData() {
        try {
            // retrieves assigned question to candidate
            const result = await getAssignedQuestions({ recordId: this.recordId });
            this.setName = result[0].Set_Name;
            this.fullMarks = result[0].Full_Marks;
            this.passMarks = result[0].Pass_Marks;
            this.obtainedMarks = result[0].Obtained_Marks;
            console.log("Result::::::: " + JSON.stringify(result));
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
        } catch (error) {
            console.error("Error fetching questions:: " + JSON.stringify(error));
            this.error = error;
            this.exams = [];
        }
    }

    async loadCandidateResponse() {
        try {
            const result = await getCandidateResponse({ recordId: this.recordId });
            const parsedResult = JSON.parse(result);
            this.userAnswers = parsedResult;
        } catch (error) {
            console.error("Error fetching candidate response:: " + JSON.stringify(error));
        }
    }

    // getExamOptionChecked(exam, option) {
    //     return exam.selectedOption === option.value;
    // }

    closeModal() {
        this.showModal = false;
    }

    // add proper text colors to candidate answers, correct answer, wrong answer and unattempted answer
    updateAnswerStyles() {
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});

        const filteredExams = this.exams.filter(exam => userAnswersMap.hasOwnProperty(exam.number));
        console.log("filteredExams length:: " + filteredExams.length);
        this.totalNoOfQuestion = filteredExams.length;
        this.exams = filteredExams.map(exam => {
            const userAnswer = userAnswersMap[exam.number];

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
                this.noOfFreeEnd++;
                exam.userAnswer = userAnswer;
            }

            return exam;
        });

    }

    get showFinalMarksButton() {
        return this.noOfFreeEnd > 0 && this.hasObtainedMarksPermission;
    }

    get numberedExams() {
        return this.exams;
    }

    handleFinalMarksChange(event) {
        this.editedFinalMarks = parseFloat(event.target.value);
    }

    handleSubmit() {
        this.showModal = true;
    }
    //calculate per question marks of free-end and saves final marking 
    async confirmSubmit() {
        this.isSubmitted = true;
        this.showModal = false;
        console.log("noOfFreeEnd::::" + this.noOfFreeEnd);
        console.log("totalNoOfQuestion::::" + this.totalNoOfQuestion);
        const perQuestionMarks = this.fullMarks / this.totalNoOfQuestion;
        const totalFreeEndMarks = perQuestionMarks * this.noOfFreeEnd;
        console.log("totalFreeEndMarks::::" + totalFreeEndMarks);
        if (this.editedFinalMarks > totalFreeEndMarks) {
            const errorMessage = 'Total Free End Question for this examination is ' + totalFreeEndMarks;
            this.showToast('Error', errorMessage, 'error');
            return;
        }
        // Update Exam object
        const finalObtainedMarks = parseFloat(this.obtainedMarks) + parseFloat(this.editedFinalMarks);
        await updateExamObjectApex({ examId: this.examId, obtainedMarks: this.editedFinalMarks, responseId: this.recordId })
            .then(async result => {
                if (result == 'success') {
                    await updateCandidateResponseApproval({ responseId: this.recordId, passMarks: this.passMarks, finalObtainedMarks: finalObtainedMarks })
                        .then(result => {
                            if (result === 'Success') {

                                this.showToast('Success', 'Candidate Response updated successfully', 'success');

                                setTimeout(() => {
                                    window.location.reload();
                                }, 1200);
                            } else {
                                console.error('Validation Exception: ' + result);
                                this.showToast('Error', result, 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Error updating Candidate Response: ' + JSON.stringify(error));
                            this.showToast('Error', 'Error updating Candidate Response', 'error');
                        });
                } else {
                    this.showToast('Error', 'Final Obtained Marks is greater than total marks', 'error');
                }
            })
            .catch(error => {
                console.error('Error updating Exam Object: ' + JSON.stringify(error));

            });


    }
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

}

function cleanQuestionString(question) {
    return question.replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n');
}
