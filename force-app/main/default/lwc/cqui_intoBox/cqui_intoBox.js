
import getExamId from '@salesforce/apex/SQX_examController.getExamId';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import updateExamStatusToOngoing from '@salesforce/apex/SQX_examController.updateExamStatusToOngoing';
import { LightningElement, track } from 'lwc';

export default class IntroBox extends LightningElement {
    showModal = false;
    isExamStarted = false;
    @track examFinished = false;
    startTimerOnLoad = false;

    async connectedCallback() {
        try {
            const examId = await getExamId();
            try {
                const answerSubmitted = await isAnswerSubmitted({ examId: examId });
                if (answerSubmitted) {
                    this.examFinished = true;
                    this.isExamStarted = true;
                } else {
                    const savedStartTime = localStorage.getItem('startTime');
                    if (savedStartTime != null) {
                        this.showModal = false;
                        this.isExamStarted = true;
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

    async startExam() {
        const examId = await getExamId();
        try {
            try {
                await updateExamStatusToOngoing({ examId: examId });
                this.showModal = false;
                this.isExamStarted = true;
                localStorage.setItem('startTime', Math.floor(Date.now() / 1000).toString());
                this.startTimerOnLoad = true;

            } catch (error) {
                console.error("Error updating exam status::: " + JSON.stringify(error));
            }
        } catch (error) {
            console.error("Error fetching examId::: " + JSON.stringify(error));
        }
    }


}


