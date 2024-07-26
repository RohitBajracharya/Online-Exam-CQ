import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_examController.getCandidateResponse';
import getOngoingExamId from '@salesforce/apex/SQX_examController.getOngoingExamId';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import saveCandidateResponse from '@salesforce/apex/SQX_examController.saveCandidateResponse';
import saveObtainedMarks from '@salesforce/apex/SQX_examController.saveObtainedMarks';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, api, track } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;
    @track userAnswers = [];
    @track isSubmitted = false;
    @track showModal = false;
    obtainedMarks = 0;
    @api examId;
    setName = '';
    fullMarks = '';
    passMarks = '';
    examFinished = false;
    remainingTime;
    displayResult;
    noOfFreeEnd = 0;

    freeEndQues;
    mcqQues;
    multipleMcqQues;
    freeEndQuestion;
    mcqQuestion;
    multipleMcqQuestion;
    num = 0;

    async connectedCallback() {
        this.num = 0;

        // Retrieve saved exams from localStorage if available
        const savedExams = localStorage.getItem('exams');

        await getOngoingExamId()
            .then(res => {
                if (res != null) {
                    this.examId = res;
                }
            })
            .catch(error => {
                console.error("error::: " + JSON.stringify(error));
            });

        await getAssignedQuestions({ examId: this.examId })
            .then(async result => {
                if (result && result.length > 0) {
                    this.setName = result[0].Set_Name;
                    this.fullMarks = result[0].Full_Marks;
                    this.passMarks = result[0].Pass_Marks;
                    this.displayResult = result[0].Display_Result;
                    if (savedExams) {
                        this.exams = []
                        this.exams = JSON.parse(savedExams);
                    } else {

                        this.exams = result.map((exam, idx) => {
                            const questionOptions = exam.Question_Options ? exam.Question_Options.split('/') : [];
                            if (exam.Question_Type === 'Free End') {
                                this.noOfFreeEnd++;
                            }
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
                                selectedOption: '', // Initialize with empty string
                                selectedOptions: [],
                                userAnswer: '',
                                number: idx + 1,
                            };
                        });
                        this.examId = result[0].Id;
                        this.error = undefined;
                    }

                    await this.checkIfSubmitted();
                    await this.groupingQuestion();
                } else {
                    this.error = 'Currently there is no examination for you.';
                }
            })
            .catch(error => {
                this.error = error;
                this.exams = [];
            });

    }

    get questionNumber() {
        return ++this.num;
    }

    async groupingQuestion() {
        this.freeEndQues = this.exams.filter(exam => exam.isFreeEnd == true);
        this.mcqQues = this.exams.filter(exam => exam.isMCQ == true);
        this.multipleMcqQues = this.exams.filter(exam => exam.isMultiple_Select_MCQ == true);
        this.exams = [];
        this.exams.push(...this.freeEndQues, ...this.mcqQues, ...this.multipleMcqQues);

        this.exams = this.exams.map((exam, index) => ({
            ...exam,
            number: index + 1
        }));

        this.freeEndQuestion = this.freeEndQues.length > 0 ? true : false;
        this.mcqQuestion = this.mcqQues.length > 0 ? true : false;
        this.multipleMcqQuestion = this.multipleMcqQues.length > 0 ? true : false;

        // Save exams to localStorage
        localStorage.setItem('exams', JSON.stringify(this.exams));
    }

    async checkIfSubmitted() {
        try {
            if (this.examId) {
                await isAnswerSubmitted({ examId: this.examId })
                    .then(res => {
                        var answerSubmission = JSON.stringify(res);
                        if (answerSubmission == "true") {
                            this.isSubmitted = true;
                            this.examFinished = true;
                            this.loadCandidateResponse();
                        } else {
                            this.isSubmitted = false;
                            this.examFinished = false;
                        }
                    }).catch(error => {
                        console.error("error in isAnswerSubmitted::" + JSON.stringify(error));
                    });
            } else {
                console.warn('ExamId is undefined.');
            }
        } catch (error) {
            console.error('Error checking if exam is submitted:', JSON.stringify(error));
            this.showToast("Error", "Failed to check if exam is submitted", "error");
        }
    }

    loadCandidateResponse() {
        getCandidateResponse({ examId: this.examId })
            .then(result => {
                const parsedResult = JSON.parse(result);
                this.userAnswers = parsedResult;
                this.updateAnswerStyles();
            })
            .catch(error => {
                console.error('Error loading candidate response', JSON.stringify(error));
                this.showToast("Error", "Failed to load candidate response", "error");
            });
    }

    handleOptionChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const option = event.target.value;
        const isChecked = event.target.checked;

        this.exams = this.exams.map((exam, index) => {
            if (index === questionNumber - 1) {
                if (exam.isMCQ) {
                    return {
                        ...exam,
                        selectedOption: option,
                        questionOptions: exam.questionOptions.map(opt => ({
                            ...opt,
                            isSelected: opt.value === option
                        }))
                    };
                } else if (exam.isMultiple_Select_MCQ) {
                    let updatedOptions = exam.selectedOptions;

                    if (isChecked) {
                        updatedOptions.push(option);
                    } else {
                        updatedOptions = updatedOptions.filter(item => item !== option);
                    }

                    return {
                        ...exam,
                        selectedOptions: updatedOptions,
                        questionOptions: exam.questionOptions.map(opt => ({
                            ...opt,
                            isSelected: updatedOptions.includes(opt.value)
                        }))
                    };
                }
            }
            return exam;
        });

        // Save updated exams to localStorage
        localStorage.setItem('exams', JSON.stringify(this.exams));
    }

    handleAnswerChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const answer = event.target.value;

        this.exams = this.exams.map(exam => {
            if (exam.number === questionNumber) {
                return { ...exam, userAnswer: answer || '' };
            }
            return exam;
        });

        // Save updated exams to localStorage
        localStorage.setItem('exams', JSON.stringify(this.exams));
    }

    async handleSubmit() {
        this.userAnswers = this.exams.map(exam => ({
            questionId: exam.QuestionId,
            questionNumber: exam.number,
            answer: exam.isMCQ
                ? exam.questionOptions.find(opt => opt.value === exam.selectedOption)?.label || ''
                : exam.isMultiple_Select_MCQ
                    ? exam.selectedOptions
                        .map(option => exam.questionOptions.find(opt => opt.value === option)?.label)
                        .sort()
                        .join(', ')
                    : exam.userAnswer || '___Didnt attempt___'
        }));

        await this.checkIfSubmitted();
        if (this.isSubmitted == true) {
            this.showToast("Error", "Answer already submitted", "error");
        } else {
            await this.calculateMarks();

            var passingStatus;
            if (this.obtainedMarks > this.passMarks) {
                passingStatus = 'Pass';
            } else {
                passingStatus = 'Fail';
            }

            saveCandidateResponse({ userAnswers: JSON.stringify(this.userAnswers), examId: this.examId, noOfFreeEndQuestion: this.noOfFreeEnd, passStatus: passingStatus })
                .then(result => {
                    saveObtainedMarks({ obtainedMarks: this.obtainedMarks, examId: this.examId }).then(result => {
                        this.showModal = true;
                        this.remainingTime = "0";
                        this.updateAnswerStyles();
                        this.isSubmitted = true;

                        // Clear localStorage on successful submission
                        localStorage.removeItem('exams');
                        localStorage.removeItem('examDuration');
                    }).catch(error => {
                        this.showToast("Error", error.message, "error");
                        console.error('Error submitting answers:', error.message);
                    });
                })
                .catch(error => {
                    this.showToast("Error", "Exam Failed to submit", "error");
                    console.error('Error submitting answers:', error);
                });
        }
    }

    async calculateMarks() {
        this.obtainedMarks = 0.0;
        try {
            
            this.userAnswers.forEach(userAnswer => {
                const exam = this.exams.find(ex => ex.QuestionId === userAnswer.questionId);
                if (exam) {
                    const marksPerQuestion = parseFloat(exam.Marks_Carried) || 0;
                    if (exam.isMCQ) {
                        if (userAnswer.answer === exam.correctAnswer[0]) {
                            this.obtainedMarks = Math.ceil(this.obtainedMarks + marksPerQuestion);
                        }
                    } else if (exam.isMultiple_Select_MCQ) {
                        if (userAnswer.answer.split(', ').length > exam.correctAnswer.length) {
                            // If more options are selected than the correct number of answers, set marks to zero
                            this.obtainedMarks += 0;
                        } else {
                            const correctAnswers = exam.correctAnswer.length;
                            const userCorrectAnswers = userAnswer.answer.split(', ').filter(answer => exam.correctAnswer.includes(answer)).length;
                            const partialMarks = (userCorrectAnswers / correctAnswers) * marksPerQuestion;
                            this.obtainedMarks = Math.ceil(this.obtainedMarks + partialMarks);
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error while calculating marks:: " + JSON.stringify(error));
        }
    }
    


    updateAnswerStyles() {
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});

        this.exams = this.exams.map(exam => {
            const userAnswer = userAnswersMap[exam.number];

            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                exam.questionOptions = exam.questionOptions.map(option => {
                    const isCorrect = exam.correctAnswer.includes(option.label);
                    const isSelected = exam.isMCQ
                        ? userAnswer === option.label
                        : userAnswer.split(', ').includes(option.label);

                    let optionClass = 'default-option';
                    if (this.displayResult == "Show result after submission") {
                        if (isSelected) {
                            optionClass = isCorrect ? 'correct-answer' : 'incorrect-answer';
                        } else if (userAnswer === '' && isCorrect) {
                            optionClass = 'unattempted-correct-answer';
                        } else if (isCorrect) {
                            optionClass = 'correct-answer';
                        }
                    }

                    return {
                        ...option,
                        optionClass
                    };
                });
            } else if (exam.isFreeEnd) {
                if (this.displayResult == "Show result after submission") {
                    exam.userAnswer = userAnswer;
                } else {
                    exam.userAnswer = '';
                }
            }
            return exam;
        });
    }

    get numberedExams() {
        return this.exams;
    }

    handleCloseModal() {
        this.showModal = false;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }

    get passStatus() {
        if (this.obtainedMarks > this.passMarks)
            return true;
        else
            return false;
    }

    get doDisplayResult() {
        if (this.displayResult == "Don't show result after submission") {
            return false;
        } else if (this.displayResult == "Show result after submission") {
            return true;
        }
    }
}

function cleanQuestionString(question) {
    return question.replace(/(<([^>]+)>)/gi, "");
}