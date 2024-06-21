public with sharing class SQX_questionSetController {
  
    @AuraEnabled(cacheable=true)
    public static List<SQX_Set__c> getSetPicklistValues() {
        System.debug('picklist');
    
        List <SQX_Set__c> setName= [SELECT Id, SQX_Name__c FROM SQX_Set__c]; 
        System.debug('setNME:::'+setName);
        return setName;
    }
    
    

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getQuestions() {
        List<Map<String, Object>> questions = new List<Map<String, Object>>();
        
        List<SQX_Question__c> quesRecords = [SELECT Id, Name, SQX_Title__c, SQX_Type__c, SQX_Options__c, SQX_Correct_Answer__c FROM SQX_Question__c where SQX_Status__c='Approved' with SECURITY_ENFORCED];
        
        for (SQX_Question__c record : quesRecords) {
            Map<String, Object> question = new Map<String, Object>();
            question.put('Id', record.Id);
            question.put('Name', record.Name);
            question.put('SQX_Title__c', record.SQX_Title__c);
            question.put('SQX_Type__c', record.SQX_Type__c);
            question.put('SQX_Options__c', record.SQX_Options__c);
            question.put('SQX_Correct_Answer__c', record.SQX_Correct_Answer__c);
            questions.add(question);
        }
        return questions;
    }

     @AuraEnabled
    public static void createQuestionSet(String setName, List<Id> questionIds) {
        if (setName == null || setName.trim() == '') {
            throw new AuraHandledException('Please select a Set Name');
        }
        if(questionIds.size()==0){
            throw new AuraHandledException('Please select atleast one questions');
        }
        List<SQX_Question_Set__c> questionSets = new List<SQX_Question_Set__c>();
        for (Id questionId : questionIds) {
            SQX_Question_Set__c questionSet = new SQX_Question_Set__c(
                SQX_Set__c = setName,
                SQX_Question__c = questionId
            );
            questionSets.add(questionSet);
        }
        
        try {
            insert questionSets;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating Question Set: ' + e.getMessage());
        }
    }
}