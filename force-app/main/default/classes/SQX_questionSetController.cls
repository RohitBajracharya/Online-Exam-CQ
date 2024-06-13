public with sharing class SQX_questionSetController {
  
    @AuraEnabled(cacheable=true)
    public static List<String> getSetPicklistValues() {
        List<String> setValues = new List<String>();
        Schema.DescribeFieldResult fieldResult = SQX_Question_Set__c.SQX_Set__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();

        for (Schema.PicklistEntry entry : picklistEntries) {
            setValues.add(entry.getLabel());
        }
        return setValues;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getQuestions() {
        List<Map<String, Object>> questions = new List<Map<String, Object>>();
        
        List<SQX_Question__c> quesRecords = [SELECT Id, SQX_Title__c, SQX_Type__c, SQX_Options__c, SQX_Answer__c FROM SQX_Question__c where SQX_Status__c='Approved'];
        
        for (SQX_Question__c record : quesRecords) {`
            Map<String, Object> question = new Map<String, Object>();
            question.put('Id', record.Id);
            question.put('SQX_Title__c', record.SQX_Title__c);
            question.put('SQX_Type__c', record.SQX_Type__c);
            question.put('SQX_Options__c', record.SQX_Options__c);`
            question.put('SQX_Answer__c', record.SQX_Answer__c);
            questions.add(question);
        }
        return questions;
    }

     @AuraEnabled
    public static void createQuestionSet(String setName, List<Id> questionIds) {
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