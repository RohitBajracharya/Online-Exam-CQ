import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';
import getCandidateResponse from '@salesforce/apex/SQX_examController.getCandidateResponse';
import getFullMarks from '@salesforce/apex/SQX_examController.getFullMarks';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import saveCandidateResponse from '@salesforce/apex/SQX_examController.saveCandidateResponse';
import saveObtainedMarks from '@salesforce/apex/SQX_examController.saveObtainedMarks';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, track } from 'lwc';
export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;
    @track userAnswers = [];
    @track isSubmitted = false; // Track if the exam has been submitted
    @track showModal = false; // Track modal visibility
    obtainedMarks = 0; // Track obtained marks
    examId;
    setName = '';
    fullMarks = ''; 
    passMarks = '';
    connectedCallback() {

        // Fetch assigned questions using wire service
        getAssignedQuestions()
            .then(result => {
                if (result && result.length > 0) {
                    this.setName = result[0].Set_Name;
                    this.fullMarks = result[0].Full_Marks;
                    this.passMarks = result[0].Pass_Marks;

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
                            selectedOption: '', // Initialize with empty string
                            selectedOptions: [],
                            userAnswer: '',
                            number: idx + 1
                        };
                    });
                    this.examId = result[0].Id; // Set examId from the first exam (assuming result is not empty)
                    this.error = undefined;
                    // Check if the exam is already submitted
                    this.checkIfSubmitted();
                } else {
                    this.error = { message: 'No exams found.' }; // Handle scenario where no exams are returned
                }
            })
            .catch(error => {
                this.error = error;
                this.exams = [];
            });
    }

    // Method to check if exam is already submitted
    async checkIfSubmitted() {
        try {
            if (this.examId) {
                const result = await isAnswerSubmitted({ examId: this.examId });
                if (result === true) {
                    this.loadCandidateResponse(); // Fetch userAnswers if exam is submitted
                    this.isSubmitted = true;
                }
            } else {
                console.warn('ExamId is undefined.'); // Handle scenario where examId is undefined
            }
        } catch (error) {
            console.error('Error checking if exam is submitted:', JSON.stringify(error));
            this.showToast("Error", "Failed to check if exam is submitted", "error");
        }
    }

    // Method to load candidate response if exam is already submitted
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

    // Handle radio button or checkbox option change
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

    // Handle text input change
    handleAnswerChange(event) {
        const questionNumber = parseInt(event.target.dataset.number, 10);
        const answer = event.target.value;

        this.exams = this.exams.map(exam => {
            if (exam.number === questionNumber) {
                return { ...exam, userAnswer: answer || '' }; // Store empty string if answer is null
            }
            return exam;
        });
    }

    // Handle form submission
    handleSubmit() {
        // Calculate obtained marks
        // Prepare user answers
        this.userAnswers = this.exams.map(exam => ({
            questionId: exam.QuestionId,
            questionNumber: exam.number,
            answer: exam.isMCQ
                ? exam.questionOptions.find(opt => opt.value === exam.selectedOption)?.label || '' // Use empty string if not attempted
                : exam.isMultiple_Select_MCQ
                    ? exam.selectedOptions
                        .map(option => exam.questionOptions.find(opt => opt.value === option)?.label)
                        .sort()
                        .join(', ')
                    : exam.userAnswer || '___Didnt attempt___' // Store empty string if userAnswer is null
        }));

        this.calculateMarks();

        if (this.isSubmitted) {
            this.showToast("Error", "Answer already submitted", "error");
        } else {
            // Save candidate response
            saveCandidateResponse({ userAnswers: JSON.stringify(this.userAnswers), examId: this.examId })
                .then(result => {
                    saveObtainedMarks({ obtainedMarks: this.obtainedMarks }).then(result => {
                        this.finishExam();
                        this.showModal = true; // Show modal after submission

                        this.updateAnswerStyles(); // Update answer styles after submission
                        this.isSubmitted = true;
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

    // Calculate obtained marks for MCQ and Multiple Select questions
    async calculateMarks() {
        this.obtainedMarks = 0.0;
        try {
            const totalMarks = await getFullMarks({ examId: this.examId });
            console.log("totalmarks::: " + JSON.stringify(totalMarks));
            const totalQuestions = this.exams.length;
            const marksPerQuestion = totalMarks / totalQuestions; // Calculate marks per question

            this.userAnswers.forEach(userAnswer => {
                // Find the corresponding exam for the current user answer
                const exam = this.exams.find(ex => ex.QuestionId === userAnswer.questionId);
                if (exam) {
                    if (exam.isMCQ) {
                        // For MCQ, check if the selected option is correct
                        if (userAnswer.answer === exam.correctAnswer[0]) {
                            this.obtainedMarks += marksPerQuestion; // Add full marks for correct MCQ
                        }
                    } else if (exam.isMultiple_Select_MCQ) {
                        // For Multiple Select MCQ, calculate partial marks
                        const correctAnswers = exam.correctAnswer.length;
                        const userCorrectAnswers = userAnswer.answer.split(', ').filter(answer => exam.correctAnswer.includes(answer)).length;

                        const partialMarks = (userCorrectAnswers / correctAnswers) * marksPerQuestion;
                        this.obtainedMarks += partialMarks; // Add partial marks based on correct selections
                    }
                }
            });
        } catch (error) {
            console.error("Error while fetching total marks:: " + JSON.stringify(error));
        }


    }

    // Update answer styles based on correctness
    updateAnswerStyles() {
        // First, map the user answers to question IDs for easy lookup
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});

        // Update the exams array with proper option classes and user answers
        this.exams = this.exams.map(exam => {
            const userAnswer = userAnswersMap[exam.number];

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


    // Getter to return exams with updated styles
    get numberedExams() {
        return this.exams;
    }

    // Method to close the modal
    handleCloseModal() {
        this.showModal = false;
        window.location.reload();
    }

    // Show toast message
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
    finishExam() {
        console.log("Exam finished");
        const examFinishedEvent = new CustomEvent('examfinished', {
            detail: { isFinished: true }
        });
        this.dispatchEvent(examFinishedEvent);
    }

}

// Function to clean HTML strings (optional)
function cleanQuestionString(question) {
    // Replace any HTML tags from the question title
    return question.replace(/(<([^>]+)>)/gi, "");
}
