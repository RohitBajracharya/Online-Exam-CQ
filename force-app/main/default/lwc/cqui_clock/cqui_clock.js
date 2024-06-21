import { LightningElement, wire } from 'lwc';
import getExamDuration from '@salesforce/apex/SQX_examController.getExamDuration';

export default class Clock extends LightningElement {
    minutes; // Default duration in minutes, adjust as needed
    startTime;
    displayTime ;
    timer; // Initial display time
    
    
    connectedCallback() {
        const savedStartTime = localStorage.getItem('startTime');
        if (savedStartTime) {
            this.startTimer();  
        }
    }

    // connectedCallback() {
    //     // retrieve start time from local storage
    //     const savedStartTime = localStorage.getItem('startTime');
    //     // checks if start time is saved or not
    //     if (savedStartTime) {
    //         this.startTimer = parseInt(savedStartTime);
    //     } 
    //     else {

    //         this.startTimer = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    //         localStorage.setItem('startTime', this.startTime.toString());
    //     }
    //       // Calculate initial remaining time and update display
    //       const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    //       const elapsedTime = currentTime - this.startTime;
    //       const remainingTime = this.minutes * 60 - elapsedTime;
    //       if (remainingTime > 0) {
    //           this.updateTime(remainingTime);
    //           this.startTimer();
    //       } else {
    //           // If remaining time is not positive, clear the start time from storage
    //           clearInterval(this.timer);
    //           localStorage.removeItem('startTime');
    //       }
    // }

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
                localStorage.removeItem('startTime');
            }
        }, 1000);
    }
    // converts the total seconds into hr, min and sec and update displayTime
    updateTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        this.displayTime = `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
    }
    // converts the time format into 00:00:00
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
