public with sharing class ExamController {
    @AuraEnabled(cacheable=true)
    public static List<ExamWrapper> getExamData() {
        List<ExamWrapper> examWrappers = new List<ExamWrapper>();
        
        // Dummy data set 1
        ExamWrapper exam1 = new ExamWrapper();
        exam1.assignTo = 'John Doe';
        exam1.examSet = 'A';
        exam1.obtainedMarks = 0;
        examWrappers.add(exam1);
        
        // Dummy data set 2
        ExamWrapper exam2 = new ExamWrapper();
        exam2.assignTo = 'Jane Smith';
        exam2.examSet = 'B';
        exam2.obtainedMarks = 0;
        examWrappers.add(exam2);
        
        // Add more dummy data sets as needed
        
        return examWrappers;
    }
    
    public class ExamWrapper {
        @AuraEnabled
        public String assignTo { get; set; }
        @AuraEnabled
        public String examSet { get; set; }
        @AuraEnabled
        public Decimal obtainedMarks { get; set; }
        
        // Constructor is not needed for dummy data, can be omitted
    }
}
