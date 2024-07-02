import getExamId from '@salesforce/apex/SQX_examController.getExamId';
import getNewExamId from '@salesforce/apex/SQX_examController.getNewExamId';
import isAnotherExamScheduled from '@salesforce/apex/SQX_examController.isAnotherExamScheduled';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import updateExamStatusToOngoing from '@salesforce/apex/SQX_examController.updateExamStatusToOngoing';
import { LightningElement, track } from 'lwc';

export default class IntroBox extends LightningElement {
    showModal = false;
    isExamStarted = false;
    @track examFinished = false;
    startTimerOnLoad = false;
    error;
    examination;

    async connectedCallback() {
        try {
            const isAnotherExamSchduled = await isAnotherExamScheduled();
            console.log("isAnotherExamScheduled::: " + JSON.stringify(isAnotherExamSchduled));
            if (!isAnotherExamSchduled) {
                const examId = await getExamId();
                this.examination = examId;
                console.log("examId getting:: " + JSON.stringify(examId));
                try {
                    if (examId) {
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
                    } else {
                        this.error = 'Currently there is no examination for you. Please come back later.\n Thankyou.';
                    }
                } catch (error) {
                    console.error("Error fetching answerSubmitted::: " + JSON.stringify(error));

                }
            } else {
                const examId = await getNewExamId();
                this.examination = examId;

                console.log("examId getting new:: " + JSON.stringify(examId));
                try {
                    if (examId) {
                        const answerSubmitted = await isAnswerSubmitted({ examId: examId });
                        console.log("answerSubmitted::: " + JSON.stringify(answerSubmitted));
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
                    } else {
                        this.error = 'Currently there is no examination for you. Please come back later.\n Thankyou.';
                    }
                } catch (error) {
                    console.error("Error fetching answerSubmitted::: " + JSON.stringify(error));

                }
            }



        } catch (error) {
            console.error("Error fetching examId in intoBox::: " + JSON.stringify(error));
        }

    }
    async startExam() {
        try {
            try {
                await updateExamStatusToOngoing({ examId: this.examination });
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


