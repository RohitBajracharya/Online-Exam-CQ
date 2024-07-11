import getAssignedQuestions from '@salesforce/apex/SQX_examRecordController.getAssignedQuestions';
import { LightningElement, api } from 'lwc';

export default class Cqui_exam_record_page extends LightningElement {
    @api recordId;
    setName = '';
    fullMarks = '';
    passMarks = '';
    exams = [];
    freeEndQues;
    mcqQues;
    multipleMcqQues;
    freeEndQuestion;
    mcqQuestion;
    multipleMcqQuestion;

    async connectedCallback() {
        // Fetch assigned questions using wire service
        await getAssignedQuestions({ recordId: this.recordId })
            .then(async result => {
                if (result && result.length > 0) {
                    this.setName = result[0].Set_Name;
                    this.fullMarks = result[0].Full_Marks;
                    this.passMarks = result[0].Pass_Marks;
                    this.exams = result.map(exam => {
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
                            correctAnswer: exam.Correct_Answer ? exam.Correct_Answer.split(',') : []
                        };
                    });
                    await this.groupingQuestion();
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
        await this.updateAnswerStyles();
    }

    async groupingQuestion() {

        this.freeEndQues = this.exams.filter(exam => exam.isFreeEnd == true);
        this.mcqQues = this.exams.filter(exam => exam.isMCQ == true);
        this.multipleMcqQues = this.exams.filter(exam => exam.isMultiple_Select_MCQ == true);

        // Recombine grouped questions
        this.exams = [];
        this.exams.push(...this.freeEndQues, ...this.mcqQues, ...this.multipleMcqQues);

        // Reassign question numbers sequentially
        this.exams = this.exams.map((exam, index) => ({
            ...exam,
            number: index + 1
        }));

        // Set flags for question types
        this.freeEndQuestion = this.freeEndQues.length > 0;
        this.mcqQuestion = this.mcqQues.length > 0;
        this.multipleMcqQuestion = this.multipleMcqQues.length > 0;
    }

    async updateAnswerStyles() {
        this.exams = this.exams.map(exam => {
            const correctAnswer = exam.correctAnswer;
            if (exam.isMCQ || exam.isMultiple_Select_MCQ) {
                exam.questionOptions = exam.questionOptions.map(option => {
                    let optionClass = 'default-option';
                    if (correctAnswer.includes(option.label)) {
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
