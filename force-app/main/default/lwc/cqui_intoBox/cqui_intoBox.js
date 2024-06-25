
import getExamId from '@salesforce/apex/SQX_examController.getExamId';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import { LightningElement, track } from 'lwc';

export default class IntroBox extends LightningElement {
    showModal = false;
    isExamStarted = false;
    @track examFinished = false;
    startTimerOnLoad = false;

    async connectedCallback() {
        try {
            const examId = await getExamId();
            console.log("ExamId::: " + JSON.stringify(examId));
            try {
                const answerSubmitted = await isAnswerSubmitted({ examId: examId });
                console.log("answerSubmitted:::: " + JSON.stringify(answerSubmitted));
                if (answerSubmitted) {
                    this.examFinished = true;
                    this.isExamStarted = true;
                } else {
                    console.log("refresh");
                    const savedStartTime = localStorage.getItem('startTime');
                    console.log("savedStartTime::: " + JSON.stringify(savedStartTime));
                    if (savedStartTime != null) {
                        console.log("not null");
                        this.showModal = false;
                    } else {
                        this.showModal = true;

                    }
                }



            } catch (error) {
                console.error("Error fetching answerSubmitted::: " + JSON.stringify(error));

            }
        } catch (error) {
            console.error("Error fetching examId::: " + JSON.stringify(error));
        }

    }

    startExam() {
        console.log("Starting Exam");
        this.showModal = false;
        this.isExamStarted = true;
        localStorage.setItem('startTime', Math.floor(Date.now() / 1000).toString());
        this.startTimerOnLoad = true;

    }

    handleExamFinished(event) {
        console.log("detail:::: " + event.detail);
        this.examfinished = event.detail.isFinished;
        console.log("examfinished:::: " + this.examfinished);
    }
}


