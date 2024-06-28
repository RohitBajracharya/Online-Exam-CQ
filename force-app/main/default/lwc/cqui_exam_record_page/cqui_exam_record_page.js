import getAssignedQuestions from '@salesforce/apex/SQX_examRecordController.getAssignedQuestions';
import { LightningElement, api } from 'lwc';

export default class Cqui_exam_record_page extends LightningElement {
    @api recordId;
    setName = '';
    fullMarks = '';
    passMarks = '';
    exams = [];

    async connectedCallback() {
        // Fetch assigned questions using wire service
        await getAssignedQuestions({ recordId: this.recordId })
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
                            number: idx + 1,


                        };
                    });
                    this.error = undefined;

                } else {
                    this.error = { message: 'No exams found.' }; // Handle scenario where no exams are returned
                }
            })
            .catch(error => {
                console.error("Error fetching:::: " + JSON.stringify(error));
                this.error = error;
                this.exams = [];
            });
        this.updateAnswerStyles();

    }

    updateAnswerStyles() {
        console.log("Exams::: " + JSON.stringify(this.exams));
        // // Update the exams array with proper option classes and user answers
        this.exams = this.exams.map(exam => {
            console.log("Exam mappppp::: " + JSON.stringify(exam));
            const correctAnswer = exam.correctAnswer;
            console.log("correct Answer ::: " + JSON.stringify(correctAnswer));
            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                // Update options with classes for MCQ and Multiple Select MCQ
                exam.questionOptions = exam.questionOptions.map(option => {
                    console.log("options::: " + JSON.stringify(option.label));
                    let optionClass = 'default-option';
                    if (correctAnswer.includes(option.label)) {
                        console.log("includes");
                        optionClass = 'correct-answer';
                    }

                    return {
                        ...option,
                        optionClass
                    };
                });
            } else if (exam.isFreeEnd) {
                exam.userAnswer = '';
            }
            return exam;
        });
    }
    get numberedExams() {
        return this.exams;
    }

}

// Function to clean HTML strings (optional)
function cleanQuestionString(question) {
    // Replace any HTML tags from the question title
    return question.replace(/(<([^>]+)>)/gi, "");
}
