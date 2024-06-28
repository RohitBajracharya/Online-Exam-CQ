public with sharing class SQX_examRecordController {
 @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getAssignedQuestions(Id recordId) {
        List<Map<String, Object>> exams = new List<Map<String, Object>>();
        Id currentUserId = UserInfo.getUserId();
        Id examId;
        system.debug('recordId:: '+recordId);
       // Query to fetch question set IDs assigned to the user
        List<SQX_Exam__c> examRecords = [
            SELECT Id,SQX_Set__c,SQX_Full_Marks__c,SQX_Pass_Marks__c
            FROM SQX_Exam__c
            WHERE Id=:recordId
        ];
        System.debug('examRecords:::::::'+examRecords);
 
        Set<Id> setIds = new Set<Id>();
        Map<Id, Decimal> setFullMarksMap = new Map<Id, Decimal>();
        Map<Id, Decimal> setPassMarksMap = new Map<Id, Decimal>();
        for (SQX_Exam__c exam : examRecords) {
            setIds.add(exam.SQX_Set__c);
            setFullMarksMap.put(exam.SQX_Set__c, exam.SQX_Full_Marks__c);
            setPassMarksMap.put(exam.SQX_Set__c, exam.SQX_Pass_Marks__c);
            examId=exam.Id;
        }
 
        // Query to fetch questions related to the assigned question sets
        List<SQX_Question_Set__c> questionSetRecords = [
            SELECT Id, Name, SQX_Set__c, SQX_Set__r.SQX_Name__c, SQX_Question__c,
                   SQX_Question__r.SQX_Title__c, SQX_Question__r.SQX_Type__c,
                   SQX_Question__r.SQX_Options__c,SQX_Question__r.SQX_Correct_Answer__c
            FROM SQX_Question_Set__c
            WHERE SQX_Set__c IN :setIds
        ];
        System.debug('questionSetRecords:::'+questionSetRecords);
 
        for (SQX_Question_Set__c questionSet : questionSetRecords) {
            if (questionSet.SQX_Question__r != null) {
                Map<String, Object> questionMap = new Map<String, Object>();
                questionMap.put('Id', examId);
                questionMap.put('QuestionId', questionSet.SQX_Question__c);
                questionMap.put('Name', questionSet.Name);
                questionMap.put('Set_Name', questionSet.SQX_Set__r.SQX_Name__c);
                questionMap.put('Question_Title', questionSet.SQX_Question__r.SQX_Title__c);
                questionMap.put('Question_Type', questionSet.SQX_Question__r.SQX_Type__c);
                questionMap.put('Correct_Answer',questionSet.SQX_Question__r.SQX_Correct_Answer__c);
                questionMap.put('Full_Marks', examRecords[0].SQX_Full_Marks__c);
                questionMap.put('Pass_Marks', examRecords[0].SQX_Pass_Marks__c);
 
   
                if (questionSet.SQX_Question__r.SQX_Type__c == 'MCQ' || questionSet.SQX_Question__r.SQX_Type__c == 'Multiple Select MCQ') {
                    questionMap.put('Question_Options', questionSet.SQX_Question__r.SQX_Options__c);
                }
               
                //Ensures that Full_Marks and Pass_Marks are associated correctly with each question set (SQX_Set__c) based on the mappings from SQX_Exam__c records.
                if (setFullMarksMap.containsKey(questionSet.SQX_Set__c)) {
                    questionMap.put('Full_Marks', setFullMarksMap.get(questionSet.SQX_Set__c));
                }
 
                if (setPassMarksMap.containsKey(questionSet.SQX_Set__c)) {
                    questionMap.put('Pass_Marks', setPassMarksMap.get(questionSet.SQX_Set__c));
                }

               
   
                exams.add(questionMap);
            }
        }
        System.debug('exams::: '+exams);
        return exams;
    }

}