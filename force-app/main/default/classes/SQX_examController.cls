public with sharing class SQX_examController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getAssignedQuestions() {
        List<Map<String, Object>> exams = new List<Map<String, Object>>();
        Id currentUserId = UserInfo.getUserId();
        Id examId;

       // Query to fetch question set IDs assigned to the user
        List<SQX_Exam__c> examRecords = [
            SELECT Id,SQX_Set__c
            FROM SQX_Exam__c
            WHERE SQX_Assign_To__c = :currentUserId
        ];

        Set<Id> setIds = new Set<Id>();
        for (SQX_Exam__c exam : examRecords) {
            setIds.add(exam.SQX_Set__c);
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

    @AuraEnabled
    public static void saveCandidateResponse(List<Map<String, Object>> userAnswers, String examId) {
        try {
            SQX_Candidate_Response__c response = new SQX_Candidate_Response__c();
            response.SQX_Exam__c = examId;
            response.SQX_Candidate_Answer__c = JSON.serialize(userAnswers);
            
            insert response;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving candidate response: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void saveObtainedMarks(Decimal obtainedMarks){
        try {
            Id currentUserId = UserInfo.getUserId();
            // Query to fetch question set IDs assigned to the user
            SQX_Exam__c exam=[Select SQX_Obtained_Marks__c,SQX_Status__c from SQX_Exam__c  WHERE SQX_Assign_To__c = :currentUserId];
            exam.SQX_Obtained_Marks__c=obtainedMarks;
            exam.SQX_Status__c='Completed';
            update exam;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Boolean isAnswerSubmitted(Id examId) {
        
            Id currentUserId = UserInfo.getUserId();
            // Query to check if candidate response exists for the specified exam
            Integer responseCount = [
                SELECT Count()
                FROM SQX_Candidate_Response__c
                WHERE SQX_Exam__c = :examId
                AND OwnerId = :currentUserId
            ];
            List<SQX_Exam__c> exam=[Select Id from SQX_Exam__c where SQX_Status__c='Completed' and Id=:examId and SQX_Assign_To__c=:currentUserId];
            return responseCount>0 && exam.size()>0;
       
    }

    @AuraEnabled
    public static List<String> getCandidateResponse(ID examId) {
        try {
            Id currentUserId = UserInfo.getUserId();

            // Query to fetch candidate responses for the specified exam
            List<SQX_Candidate_Response__c> responses = [
                SELECT SQX_Candidate_Answer__c
                FROM SQX_Candidate_Response__c
                WHERE OwnerId = :currentUserId
                and SQX_Exam__c=:examId
            ];

            // Prepare list of answers to return
            List<String> formattedResponses = new List<String>();
            for (SQX_Candidate_Response__c response : responses) {
                formattedResponses.add(response.SQX_Candidate_Answer__c);
            }

            return formattedResponses;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching candidate response: ' + e.getMessage());
        }
    }

   
}

