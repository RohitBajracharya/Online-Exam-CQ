({
    init: function (component) {
        var openModal = true;
        // Find the component whose aura:id is "flowData"
        var flow = component.find("flowData");
        // In that component, start your flow. Reference the flow's API Name.
        flow.startFlow("exam_create_form");
    },

    handleCloseModal: function (component, event, helper) {
        var navService = component.find("navService");
        console.log("navservice:: " + navService);
        var pageReference = {
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'SQX_Exam__c',
                actionName: 'list'
            }
        };
        event.preventDefault();
        navService.navigate(pageReference);
    }
})