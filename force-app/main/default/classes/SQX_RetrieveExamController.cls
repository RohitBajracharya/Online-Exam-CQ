public with sharing class SQX_RetrieveExamController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getAssignedQuestions(Id recordId) {
        List<Map<String, Object>> exams = new List<Map<String, Object>>();
        Id currentUserId = UserInfo.getUserId();
        Id examId;

         SQx_Candidate_Response__c response= [
            SELECT SQX_Exam__c FROM SQX_Candidate_Response__c
            WHERE Id= :recordId
        ];
System.debug('response;;;;;;;;'+response);
        List<SQX_Exam__c> examRecords = [
            SELECT Id, SQX_Set__c,SQX_Full_Marks__c,SQX_Pass_Marks__c,SQX_Obtained_Marks__c
            FROM SQX_Exam__c
            WHERE Id = : response.SQX_Exam__c
        ];
        System.debug('examRecords;;;;;;;;'+examRecords);
        Set<Id> setIds = new Set<Id>();
        Map<Id, Decimal> setFullMarksMap = new Map<Id, Decimal>();
        Map<Id, Decimal> setPassMarksMap = new Map<Id, Decimal>();
        Map<Id, Decimal> setObtainedMarksMap = new Map<Id,Decimal>();
        for (SQX_Exam__c exam : examRecords) {
            setIds.add(exam.SQX_Set__c);
            setFullMarksMap.put(exam.SQX_Set__c, exam.SQX_Full_Marks__c);
            setPassMarksMap.put(exam.SQX_Set__c, exam.SQX_Pass_Marks__c);
            setObtainedMarksMap.put(exam.SQX_Set__c, exam.SQX_Obtained_Marks__c);
            examId = exam.Id;
        }

        List<SQX_Question_Set__c> questionSetRecords = [
            SELECT Id, Name, SQX_Set__c, SQX_Set__r.SQX_Name__c, SQX_Question__c, 
                   SQX_Question__r.SQX_Title__c, SQX_Question__r.SQX_Type__c, 
                   SQX_Question__r.SQX_Options__c, SQX_Question__r.SQX_Correct_Answer__c
            FROM SQX_Question_Set__c
            WHERE SQX_Set__c IN :setIds
        ];

        for (SQX_Question_Set__c questionSet : questionSetRecords) {
            if (questionSet.SQX_Question__r != null) {
                Map<String, Object> questionMap = new Map<String, Object>();
                questionMap.put('Id', examId);
                questionMap.put('QuestionId', questionSet.SQX_Question__c);
                questionMap.put('Name', questionSet.Name);
                questionMap.put('Set_Name', questionSet.SQX_Set__r.SQX_Name__c);
                questionMap.put('Question_Title', questionSet.SQX_Question__r.SQX_Title__c);
                questionMap.put('Question_Type', questionSet.SQX_Question__r.SQX_Type__c);
                questionMap.put('Correct_Answer', questionSet.SQX_Question__r.SQX_Correct_Answer__c);
                questionMap.put('Full_Marks', examRecords[0].SQX_Full_Marks__c);
                questionMap.put('Pass_Marks', examRecords[0].SQX_Pass_Marks__c);
                questionMap.put('Obtained_Marks', examRecords[0].SQX_Obtained_Marks__c);
                
                

                if (questionSet.SQX_Question__r.SQX_Type__c == 'MCQ' || questionSet.SQX_Question__r.SQX_Type__c == 'Multiple Select MCQ') {
                    questionMap.put('Question_Options', questionSet.SQX_Question__r.SQX_Options__c);
                }
                if (setFullMarksMap.containsKey(questionSet.SQX_Set__c)) {
                    questionMap.put('Full_Marks', setFullMarksMap.get(questionSet.SQX_Set__c));
                }
 
                if (setPassMarksMap.containsKey(questionSet.SQX_Set__c)) {
                    questionMap.put('Pass_Marks', setPassMarksMap.get(questionSet.SQX_Set__c));
                }
                exams.add(questionMap);
            }
        }
        return exams;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getCandidateResponse(ID recordId) {
        try {
            Id currentUserId = UserInfo.getUserId();

            List<SQX_Candidate_Response__c> responses = [
                SELECT SQX_Candidate_Answer__c
                FROM SQX_Candidate_Response__c
                WHERE Id=:recordId
            ];
            system.debug('candidatte:: '+responses);
            List<String> formattedResponses = new List<String>();
            for (SQX_Candidate_Response__c response : responses) {
                formattedResponses.add(response.SQX_Candidate_Answer__c);
            }

            return formattedResponses;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching candidate response: ' + e.getMessage());
        }
    }


    @AuraEnabled
    public static void updateExamObjectApex(Id examId, Decimal obtainedMarks) {
        SQX_Exam__c exam = [SELECT Id, SQX_Obtained_Marks__c FROM SQX_Exam__c WHERE Id = :examId];
        exam.SQX_Obtained_Marks__c = obtainedMarks;
        update exam;
    }
}
