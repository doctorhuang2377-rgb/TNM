export interface StagingConfig {
  id: 'lung' | 'esophageal' | 'thymic';
  title: string;
  description: string;
  params: {
    T: Question[];
    N: Question[];
    M: Question[];
  };
}

export interface Question {
  id: string;
  text: string;
  type: 'select' | 'boolean' | 'number';
  options?: string[];
  placeholder?: string;
  category: 'T' | 'N' | 'M';
}
