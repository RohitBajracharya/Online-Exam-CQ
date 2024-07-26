public with sharing class SQX_createExamController {
   @AuraEnabled
   public static List<User> getCandidates(){
        List<User> user=[Select ID,LastName from User where ProfileId='00edL000002ZoGvQAK'];
        system.debug('users:: '+user);
        return user;
   }
}