import getAssignedQuestions from '@salesforce/apex/SQX_examController.getAssignedQuestions';
import saveCandidateResponse from '@salesforce/apex/SQX_examController.saveCandidateResponse';
import saveObtainedMarks from '@salesforce/apex/SQX_examController.saveObtainedMarks';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, track, wire } from 'lwc';

export default class ExamComponent extends LightningElement {
    @track exams = [];
    @track error;
    @track userAnswers = [];
    @track isSubmitted = false; // Track if the exam has been submitted
    @track showModal = false; // Track modal visibility
    obtainedMarks = 0; // Track obtained marks
    examId;

    // Fetch assigned questions using wire service
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
                        label: `Option ${String.fromCharCode(65 + index)}`
                    })),
                    correctAnswer: exam.Correct_Answer ? exam.Correct_Answer.split(',') : [],
                    selectedOption: null,
                    selectedOptions: [],
                    userAnswer: '',
                    number: idx + 1
                };
            });
            this.examId = data[0].Id; // Assuming you set examId from the first exam
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.exams = [];
        }

        console.log("Exams::" + JSON.stringify(this.exams));
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
                ? exam.questionOptions.find(opt => opt.value === exam.selectedOption)?.label
                : exam.isMultiple_Select_MCQ
                    ? exam.selectedOptions
                        .map(option => exam.questionOptions.find(opt => opt.value === option)?.label)
                        .sort()
                        .join(', ')
                    : exam.userAnswer || '___Didnt attempt___' // Store empty string if userAnswer is null
        }));

        this.calculateMarks();

        // Save candidate response
        saveCandidateResponse({ userAnswers: JSON.stringify(this.userAnswers), examId: this.examId })
            .then(result => {
                saveObtainedMarks({ obtainedMarks: this.obtainedMarks }).then(result => {
                    console.log('Answers submitted successfully:', result);
                    this.showModal = true; // Show modal after submission
                    this.updateAnswerStyles(); // Update answer styles after submission
                    this.isSubmitted = true;
                }).catch(error => {
                    this.showToast("Error", error.message, "error");
                    console.error('Error submitting answers:', error.message);
                });
                // Mark as submitted
            })
            .catch(error => {
                this.showToast("Error", "Exam Failed to submit", "error");
                console.error('Error submitting answers:', error);
            });
    }

    // Calculate obtained marks for MCQ and Multiple Select questions
    calculateMarks() {
        this.obtainedMarks = 0.0; // Initialize obtainedMarks to 0
        console.log("Calculating marks::");
        this.userAnswers.forEach(userAnswer => {
            // Find the corresponding exam for the current user answer
            const exam = this.exams.find(ex => ex.QuestionId === userAnswer.questionId);
            if (exam) {
                // Compare userAnswer with correctAnswer
                if (exam.isMCQ) {
                    // For MCQ, check if the selected option is correct
                    if (userAnswer.answer === exam.correctAnswer[0]) {
                        this.obtainedMarks += 10.0; // Add 10 marks for correct MCQ
                    }
                } else if (exam.isMultiple_Select_MCQ) {
                    // For Multiple Select MCQ, compare sorted answers
                    const correctAnswer = exam.correctAnswer.sort().join(', ');
                    const userAnswerFormatted = userAnswer.answer.split(',').map(opt => opt.trim()).sort().join(', ');
                    if (userAnswerFormatted === correctAnswer) {
                        this.obtainedMarks += 10.0; // Add 10 marks for correct Multiple Select MCQ
                    }
                }
            }
        });

        console.log("Total obtained marks:", this.obtainedMarks); // Debugging output
    }

    // Update answer styles based on correctness
    updateAnswerStyles() {
        // First, map the user answers to question IDs for easy lookup
        const userAnswersMap = this.userAnswers.reduce((map, userAnswer) => {
            map[userAnswer.questionNumber] = userAnswer.answer;
            return map;
        }, {});

        // Update the exams array with proper option classes
        this.exams = this.exams.map(exam => {
            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                exam.questionOptions = exam.questionOptions.map(option => {
                    // Determine if this option is the correct answer
                    const isCorrect = exam.correctAnswer.includes(option.label); // correctAnswer stores labels like 'Option B'

                    // Determine if the user selected this option
                    const userAnswer = userAnswersMap[exam.number];
                    const isSelected = exam.isMCQ
                        ? userAnswer === option.label
                        : userAnswer.split(', ').includes(option.label); // Handle multiple selections

                    // Determine the option class based on selection and correctness
                    let optionClass = 'default-option';

                    if (isSelected) {
                        if (isCorrect) {
                            optionClass = 'correct-answer'; // User selected the correct answer
                        } else {
                            optionClass = 'incorrect-answer'; // User selected the incorrect answer
                        }
                    } else if (isCorrect) {
                        optionClass = 'correct-answer'; // Highlight correct answers not selected by the user
                    }

                    return {
                        ...option,
                        optionClass
                    };
                });
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
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
}

// Function to clean HTML strings (optional)
function cleanQuestionString(question) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = question;
    return tempElement.textContent || tempElement.innerText || '';
}
