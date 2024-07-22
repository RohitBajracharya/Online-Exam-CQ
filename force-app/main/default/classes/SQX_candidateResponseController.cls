public with sharing class SQX_candidateResponseController {
    @AuraEnabled(cacheable=true)
    public static List<ExamWrapper> getExamData() {
        List<SQX_Candidate_Response__c> candidateResponses = [
            SELECT Id, SQX_Exam__r.SQX_Assign_To__r.Name, SQX_Exam__r.SQX_Set_Name_Display__c, 
            SQX_Exam__r.SQX_Obtained_Marks__c,SQX_Pass_Status__c ,SQX_Admin_Approved__c
            FROM SQX_Candidate_Response__c
        ];
        
        List<ExamWrapper> examWrappers = new List<ExamWrapper>();
        
        for (SQX_Candidate_Response__c candidateResponse : candidateResponses) {
            ExamWrapper examWrapper = new ExamWrapper();
            examWrapper.id = candidateResponse.Id;
            examWrapper.assignTo = candidateResponse.SQX_Exam__r.SQX_Assign_To__r.Name;
            examWrapper.examSet = candidateResponse.SQX_Exam__r.SQX_Set_Name_Display__c;
            examWrapper.obtainedMarks = candidateResponse.SQX_Exam__r.SQX_Obtained_Marks__c;
            examWrapper.passStatus = candidateResponse.SQX_Pass_Status__c;
            examWrapper.adminApproved = candidateResponse.SQX_Admin_Approved__c;
            examWrappers.add(examWrapper);
        }
        
        return examWrappers;
    }
    
    public class ExamWrapper {
        @AuraEnabled
        public String id { get; set; }
        @AuraEnabled
        public String assignTo { get; set; }
        @AuraEnabled
        public String examSet { get; set; }
        @AuraEnabled
        public Decimal obtainedMarks { get; set; }
        @AuraEnabled
        public String passStatus { get; set; }
        @AuraEnabled
        public String adminApproved { get; set; }
    }
}