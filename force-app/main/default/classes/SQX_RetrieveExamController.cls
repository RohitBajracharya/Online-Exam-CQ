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
        List<SQX_Exam__c> examRecords = [
            SELECT Id, SQX_Set__c,SQX_Full_Marks__c,SQX_Pass_Marks__c,SQX_Obtained_Marks__c
            FROM SQX_Exam__c
            WHERE Id = : response.SQX_Exam__c
        ];
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
    public static String updateExamObjectApex(Id examId, Decimal obtainedMarks) {
        SQX_Exam__c exam = [SELECT Id, SQX_Obtained_Marks__c,SQX_Full_Marks__c FROM SQX_Exam__c WHERE Id = :examId];
        Decimal finalObtainedMarks=exam.SQX_Obtained_Marks__c+obtainedMarks;
        if(finalObtainedMarks<exam.SQX_Full_Marks__c){
            exam.SQX_Obtained_Marks__c = finalObtainedMarks;
            update exam;
            return 'success';
        }else{
            return 'fail';
        }
        
        
    }

    @AuraEnabled
    public static String updateCandidateResponseApproval(Id responseId, Decimal finalObtainedMarks, Decimal passMarks) {
        try {
            SQX_Candidate_Response__c response = [SELECT Id, SQX_Admin_Approved__c, SQX_Pass_Status__c FROM SQX_Candidate_Response__c WHERE Id = :responseId LIMIT 1];
            
            // Update the admin approval status to Approved
            response.SQX_Admin_Approved__c = 'Approved';
            
            // Check if the obtained marks exceed the pass marks and set the status accordingly
            if (finalObtainedMarks > passMarks) {
                response.SQX_Pass_Status__c = 'Pass';
            } else {
                response.SQX_Pass_Status__c = 'Fail';
            }

            update response;
            return 'Success';
        } catch (Exception e) {
            return e.getMessage();
        }
    }

    // checks and return boolean value for whether user have 'OnlineExamAdmin_PS3' permission set assigned
    @AuraEnabled(cacheable=true)
    public static Boolean getObtainMarksEditPermission(){
        Id userId=UserInfo.getUserId();
        Boolean hasPermission=false;
        List<PermissionSetAssignment> lstcurrentUserPerSet =    [SELECT Id, PermissionSet.Name,AssigneeId FROM PermissionSetAssignment
                                                                WHERE AssigneeId = :userId ];
        for(PermissionSetAssignment ps:lstcurrentUserPerSet ) {
            if(ps.PermissionSet.Name.equals('OnlineExamAdmin_PS3')){
                hasPermission=true;
                break;
            }
        }        
        return hasPermission;                              
    }

    @AuraEnabled(cacheable=true)
    public static User getCandidateInfo(Id recordId){
        SQX_Candidate_Response__c response=[Select SQX_Exam__c from SQX_Candidate_Response__c where Id=:recordId];
        SQX_Exam__c exam=[Select SQX_Assign_To__c from SQX_Exam__c where Id=:response.SQX_Exam__c];
        User candidateInfo=[Select Id,Name,Email from User where Id=:exam.SQX_Assign_To__c];
        System.debug('candidateInfo:: '+candidateInfo);
        return candidateInfo;
    }

    @AuraEnabled(cacheable=true)
    public static Boolean isAdminApproved(Id recordId){
        SQX_Candidate_Response__c exam=[Select SQX_Admin_Approved__c from SQX_Candidate_Response__c where Id=:recordId];
        if(exam.SQX_Admin_Approved__c=='Approved'){
            return true;
        }else{
            return false;
        }
    }
}
