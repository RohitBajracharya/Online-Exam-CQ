public with sharing class SQX_examController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getAssignedQuestions() {
        List<Map<String, Object>> exams = new List<Map<String, Object>>();
        Id currentUserId = UserInfo.getUserId();

       // Query to fetch question set IDs assigned to the user
        List<SQX_Exam__c> examRecords = [
            SELECT SQX_Set__c
            FROM SQX_Exam__c
            WHERE SQX_Assign_To__c = :currentUserId
        ];

        Set<Id> setIds = new Set<Id>();
        for (SQX_Exam__c exam : examRecords) {
            setIds.add(exam.SQX_Set__c);
        }

        // Query to fetch questions related to the assigned question sets
        List<SQX_Question_Set__c> questionSetRecords = [
            SELECT Id, Name, SQX_Set__c, SQX_Set__r.SQX_Name__c, SQX_Question__c, 
                   SQX_Question__r.SQX_Title__c, SQX_Question__r.SQX_Type__c, 
                   SQX_Question__r.SQX_Options__c
            FROM SQX_Question_Set__c
            WHERE SQX_Set__c IN :setIds
        ];
        System.debug('questionSetRecords:::'+questionSetRecords);

        for (SQX_Question_Set__c questionSet : questionSetRecords) {
            if (questionSet.SQX_Question__r != null) {
                Map<String, Object> questionMap = new Map<String, Object>();
                questionMap.put('Id', questionSet.SQX_Question__c);
                questionMap.put('Name', questionSet.Name);
                questionMap.put('Set_Name', questionSet.SQX_Set__r.SQX_Name__c);
                questionMap.put('Question_Title', questionSet.SQX_Question__r.SQX_Title__c);
                questionMap.put('Question_Type', questionSet.SQX_Question__r.SQX_Type__c);
    
                if (questionSet.SQX_Question__r.SQX_Type__c == 'MCQ' || questionSet.SQX_Question__r.SQX_Type__c == 'Multiple Select MCQ') {
                    questionMap.put('Question_Options', questionSet.SQX_Question__r.SQX_Options__c);
                    // questionMap.put('Question_Answer', questionSet.SQX_Question__r.SQX_Answer__c);
                }
                 //  else if (questionSet.SQX_Question__r.SQX_Type__c == 'Free-End') {
                //     questionMap.put('Question_Answer', questionSet.SQX_Question__r.SQX_Answer__c);
                // Multiple Select MCQ}
    
                exams.add(questionMap);
            }
        }

        return exams;
    }
    @AuraEnabled(cacheable=true)
    public static String getExamDuration() {
        Id currentUserId = UserInfo.getUserId();
        SQX_Exam__c examRecord = [
            SELECT SQX_Duration__c 
            FROM SQX_Exam__c 
            WHERE SQX_Assign_To__c = :currentUserId 
            LIMIT 1
        ];
        return examRecord.SQX_Duration__c;
    }
}

