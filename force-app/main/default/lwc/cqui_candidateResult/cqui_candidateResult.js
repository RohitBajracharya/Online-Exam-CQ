import getAssignedQuestions from '@salesforce/apex/SQX_RetrieveExamController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_RetrieveExamController.getCandidateResponse';
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

    connectedCallback() {
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
            const result = await getAssignedQuestions({ recordId: this.recordId });
            this.setName = result[0].Set_Name;
            this.fullMarks = result[0].Full_Marks;
            this.passMarks = result[0].Pass_Marks;
            this.obtainedMarks = result[0].Obtained_Marks;
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
        } catch (error) {
            console.error("Error fetching questions:: " + JSON.stringify(error));
            this.error = error;
            this.exams = [];
        }
    }

    async loadCandidateResponse() {
        try {
            const result = await getCandidateResponse({ recordId: this.recordId });
            console.log("Candidate result::: " + JSON.stringify(result));
            const parsedResult = JSON.parse(result);
            this.userAnswers = parsedResult;
        } catch (error) {
            console.error("Error fetching candidate response:: " + JSON.stringify(error));
        }
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

    handleFinalMarksChange(event) {
        console.log('New Final Marks:', event.target.value);
        this.editedFinalMarks = parseFloat(event.target.value);
    }

    handleSubmit() {
        this.showModal = true;
    }
    async confirmSubmit() {
        this.isSubmitted = true;
        this.showModal = false;
        // Update Exam object
        await updateExamObjectApex({ examId: this.examId, obtainedMarks: this.editedFinalMarks, responseId: this.recordId })
            .then(async result => {
                if (result == 'success') {
                    await updateCandidateResponseApproval({ responseId: this.recordId })
                        .then(result => {
                            if (result === 'Success') {
                                console.log('Candidate Response updated successfully');

                                this.showToast('Success', 'Candidate Response updated successfully', 'success');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1500);
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


        updateExamObjectApex({ examId: this.examId, obtainedMarks: this.editedFinalMarks, responseId: this.recordId})
        .then(result => {
            console.log('Exam Object updated successfully'+this.editedFinalMarks);
            
            

            
        })
        .catch(error => {
            console.error('Error updating Exam Object: ' + JSON.stringify(error));
         
        });

        updateCandidateResponseApproval({ responseId: this.recordId , Decimal: this.editedFinalMarks, Decimal: parseFloat(this.passMarks)})
            .then(result => {
                if (result === 'Success') {
                    console.log('Candidate Response updated successfully');
                    
                    this.showToast('Success', 'Candidate Response updated successfully', 'success');
                } else {
                    console.error('Validation Exception: ' + result);
                    this.showToast('Error', result, 'error');
                }
            })
            .catch(error => {
                console.error('Error updating Candidate Response: ' + JSON.stringify(error));
                this.showToast('Error', 'Error updating Candidate Response', 'error');
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
