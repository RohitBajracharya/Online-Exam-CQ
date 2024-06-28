public with sharing class SQX_examController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getAssignedQuestions() {
        List<Map<String, Object>> exams = new List<Map<String, Object>>();
        Id currentUserId = UserInfo.getUserId();
        Id examId;
        
        // Get today's date
        Date today = Date.today();

       // Query to fetch question set IDs assigned to the user
       system.debug('todayyyyyyyyyyyyyy--------------------------------------------------'+ today);
        List<SQX_Exam__c> examRecords = [
            SELECT Id,SQX_Set__c,SQX_Full_Marks__c,SQX_Pass_Marks__c,SQX_Display_Result__c,SQX_Date__c
            FROM SQX_Exam__c
            WHERE SQX_Assign_To__c = :currentUserId
        ];
        List<SQX_Exam__C> filterExam= new List<SQX_Exam__C>(); 
        for (SQX_Exam__c exam : examRecords) {
            if (exam.SQX_Date__c != null && exam.SQX_Date__c.date() == today) {
               filterExam.add(exam);
            }
        }
        System.debug('examRecords:::::::'+examRecords);
        

        Set<Id> setIds = new Set<Id>();
        Map<Id, Decimal> setFullMarksMap = new Map<Id, Decimal>();
        Map<Id, Decimal> setPassMarksMap = new Map<Id, Decimal>();
        Map<Id, String> setDisplayResultMap = new Map<Id, String>();
        for (SQX_Exam__c exam : filterExam) {
            setIds.add(exam.SQX_Set__c);
            setFullMarksMap.put(exam.SQX_Set__c, exam.SQX_Full_Marks__c);
            setPassMarksMap.put(exam.SQX_Set__c, exam.SQX_Pass_Marks__c);
            setDisplayResultMap.put(exam.SQX_Set__c, exam.SQX_Display_Result__c);
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
                questionMap.put('Display_Result',examRecords[0].SQX_Display_Result__c);
 
   
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
        return exams;
    }

    @AuraEnabled(cacheable=true)
    public static String getExamDuration() {
        Date today = Date.today();

        Id currentUserId = UserInfo.getUserId();
        
        List<SQX_Exam__c> examRecord = [
            SELECT SQX_Duration__c,SQX_Date__c
            FROM SQX_Exam__c 
            WHERE SQX_Assign_To__c = :currentUserId 
            
        ];
        String filteredDuration = '';
    
        for (SQX_Exam__c exam : examRecord) {
            if (exam.SQX_Date__c != null && exam.SQX_Date__c.date() == today) {
                filteredDuration = String.valueOf(exam.SQX_Duration__c);
                break; // Exit loop once duration is found for today's exam
            }
        }
        system.debug('filterduration---------------------------------------------------'+filteredDuration);
        return filteredDuration;
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

    @AuraEnabled(cacheable=true)
   public static Id getExamId(){
        Id examId;
        Id currentUserId = UserInfo.getUserId();
        List<SQX_Exam__c> examRecord=[select Id from SQX_Exam__c where SQX_Assign_To__c=:currentUserId];
        for(SQX_Exam__c exam:examRecord){
            examId=exam.Id;
        }
        return examId;
   }
   
   @AuraEnabled(cacheable=true)
   public static Decimal getFullMarks(Id examId){
        Decimal fullMarks;
        Id currentUserId = UserInfo.getUserId();
        List<SQX_Exam__c> examRecord=[select SQX_Full_Marks__c from SQX_Exam__c where SQX_Assign_To__c=:currentUserId and Id=:examId];
        for(SQX_Exam__c exam:examRecord){
           fullMarks=exam.SQX_Full_Marks__c;
        }
        return fullMarks;
   }

   @AuraEnabled
   public static void updateExamStatusToOngoing(Id examId){
    Id currentUserId = UserInfo.getUserId();
    SQX_Exam__c examRecord=[Select Id,SQX_Status__c from SQX_Exam__c where SQX_Assign_To__c=:currentUserId and Id=:examId];
    examRecord.SQX_Status__c='Ongoing';
    update examRecord;
   }
}

