
import { LightningElement } from 'lwc';

export default class IntroBox extends LightningElement {
    showModal = true;
    startTimerOnLoad = false; // Flag to start the timer on button click

    connectedCallback() {
        console.log("random");
        const savedStartTime = localStorage.getItem('startTime');
        if (!savedStartTime) {
            this.showModal = true;
        } else {
            this.showModal = false; // Hide the modal if exam has started previously
            this.startTimerOnLoad = true;
            
           
        }
    }

    startExam() {
        console.log("Starting Exam");
        this.showModal = false;
        this.examStarted = true;
        localStorage.setItem('startTime', Math.floor(Date.now() / 1000).toString());
        this.startTimerOnLoad = true; // Set flag to start timer
        
        // this.modalBackdropClass = ''; 
        
    }
    // get modalBackdropClass() {
    //     return this.showModal ? 'modal-backdrop' : '';}
    
}


