import getExamDuration from '@salesforce/apex/SQX_examController.getExamDuration';
import getExamId from '@salesforce/apex/SQX_examController.getExamId';
import isAnswerSubmitted from '@salesforce/apex/SQX_examController.isAnswerSubmitted';
import { LightningElement, api } from 'lwc';

export default class Clock extends LightningElement {
    @api minutes; // Default duration in minutes, adjust as needed
    startTime;
    displayTime;
    timer; // Timer interval reference

    connectedCallback() {
        const savedStartTime = localStorage.getItem('startTime');
        const savedDuration = localStorage.getItem('examDuration');

        if (savedStartTime && savedDuration) {
            // If both startTime and examDuration are available in local storage
            this.minutes = parseInt(savedDuration);
            const elapsedSeconds = Math.floor(Date.now() / 1000) - parseInt(savedStartTime);
            const remainingTime = this.minutes * 60 - elapsedSeconds;

            if (remainingTime > 0) {
                this.updateTime(remainingTime);
                this.startTime = parseInt(savedStartTime);
                this.startTimer();
            } else {
                this.updateTime(0);
                this.stopTimer();
            }
        } else {
            // Fetch the duration from the server
            getExamDuration().then(result => {
                this.minutes = this.convertDurationToMinutes(result);
                this.startTime = Math.floor(Date.now() / 1000);
                localStorage.setItem('startTime', this.startTime);
                localStorage.setItem('examDuration', this.minutes);
                this.startTimer();
            }).catch(error => {
                console.error('Error fetching exam duration:', error);
            });
        }
    }

    stopTimer() {
        clearInterval(this.timer);
        this.updateTime(0); // Reset display to 00:00:00
    }

    async startTimer() {
        // Update display every second
        this.timer = setInterval(async () => {
            const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
            const elapsedTime = currentTime - this.startTime;
            const remainingTime = this.minutes * 60 - elapsedTime;
            if (remainingTime >= 0) {
                this.updateTime(remainingTime);
            } else {
                this.updateTime(0); // Update display to show 00:00:00  
                clearInterval(this.timer);
                localStorage.removeItem('startTime');
                localStorage.removeItem('examDuration');
                try {
                    const examId = await getExamId();
                    try {
                        const submitted = await isAnswerSubmitted({ examId: examId });
                        if (!submitted) {
                            this.dispatchEvent(new CustomEvent('timeup'));
                        }
                    } catch (error) {
                        console.error("Error checking if answer is submitted:", error);
                    }
                } catch (error) {
                    console.error("Error fetching examId:", error);
                }
            }
        }, 1000);
    }

    // Converts the total seconds into hr, min, and sec and updates displayTime
    updateTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        this.displayTime = `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
    }

    // Converts the time format into 00:00:00
    formatTime(unit) {
        return unit < 10 ? '0' + unit : unit.toString();
    }

    convertDurationToMinutes(duration) {
        const [hours, minutes, seconds] = duration.split(':').map(Number);
        return hours * 60 + minutes + Math.ceil(seconds / 60); // Convert to minutes
    }

    disconnectedCallback() {
        clearInterval(this.timer);
    }
}
