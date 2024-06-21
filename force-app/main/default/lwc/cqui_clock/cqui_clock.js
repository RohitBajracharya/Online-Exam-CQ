import { LightningElement, wire } from 'lwc';
import getExamDuration from '@salesforce/apex/SQX_examController.getExamDuration';

export default class Clock extends LightningElement {
    minutes; // Default duration in minutes, adjust as needed
    startTime;
    displayTime ; // Initial display time
    
    
    connectedCallback() {
        const savedStartTime = localStorage.getItem('startTime');
        if (savedStartTime) {
            this.startTimer();
           
        }

    }

    @wire(getExamDuration)
    wiredExamDuration({ error, data }) {
        if (data) {
            this.minutes = this.convertDurationToMinutes(data);
           
        } else if (error) {
            console.error('Error fetching exam duration:', error);
        }
    }

    startTimer() {
        console.log("hellooo");
        this.startTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds

        // Update display every second
        this.timer = setInterval(() => {
            const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
            const elapsedTime = currentTime - this.startTime;
            const remainingTime = this.minutes * 60 - elapsedTime;

            if (remainingTime >= 0) {
                this.updateTime(remainingTime);
            } else {
                this.updateTime(0); // Update display to show 00:00:00
                clearInterval(this.timer);
            }
        }, 1000);
    }

    updateTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        this.displayTime = `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
    }

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
