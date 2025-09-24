// Gerador de nomes brasileiros aleatórios
const firstNames = [
  'Ana', 'Carlos', 'Maria', 'João', 'Fernanda', 'Pedro', 'Juliana', 'Rafael',
  'Camila', 'Lucas', 'Beatriz', 'Gabriel', 'Larissa', 'Diego', 'Mariana', 'Felipe',
  'Amanda', 'Bruno', 'Patrícia', 'Thiago', 'Natália', 'André', 'Carolina', 'Rodrigo',
  'Isabela', 'Marcos', 'Priscila', 'Vinícius', 'Renata', 'Daniel', 'Vanessa', 'Leandro',
  'Cristina', 'Alexandre', 'Tatiana', 'Eduardo', 'Monique', 'Gustavo', 'Débora', 'Ricardo',
  'Aline', 'Fábio', 'Simone', 'Paulo', 'Adriana', 'Roberto', 'Eliane', 'Antônio',
  'Sandra', 'José', 'Márcia', 'Francisco', 'Silvia', 'Luiz', 'Regina', 'Mário',
  'Rosa', 'José', 'Teresa', 'Manuel', 'Lúcia', 'João', 'Rita', 'Francisco'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Monteiro', 'Cardoso',
  'Reis', 'Araújo', 'Cunha', 'Moreira', 'Melo', 'Nascimento', 'Araújo', 'Mendes',
  'Farias', 'Freitas', 'Nunes', 'Teixeira', 'Moura', 'Correia', 'Cavalcanti', 'Ramos',
  'Duarte', 'Moraes', 'Andrade', 'Nogueira', 'Machado', 'Campos', 'Vasconcelos', 'Azevedo',
  'Dantas', 'Bezerra', 'Siqueira', 'Coelho', 'Tavares', 'Pinheiro', 'Brito', 'Castro'
];

const professions = [
  'Desenvolvedor', 'Designer', 'Engenheiro', 'Médico', 'Advogado', 'Professor', 'Arquiteto',
  'Psicólogo', 'Contador', 'Jornalista', 'Publicitário', 'Chef', 'Fotógrafo', 'Músico',
  'Artista', 'Consultor', 'Analista', 'Gerente', 'Diretor', 'Coordenador', 'Supervisor',
  'Assistente', 'Técnico', 'Especialista', 'Pesquisador', 'Cientista', 'Escritor', 'Poeta',
  'Ator', 'Dançarino', 'Pintor', 'Escultor', 'Ilustrador', 'Programador', 'Analista de Sistemas',
  'Web Designer', 'UX Designer', 'Product Manager', 'Data Scientist', 'DevOps', 'QA Tester'
];

const statusOptions = [
  'Online', 'Disponível', 'Ocupado', 'Ausente', 'Férias', 'Trabalhando', 'Estudando',
  'Relaxando', 'Viajando', 'Exercitando', 'Lendo', 'Criando', 'Inovando', 'Aprendendo'
];

export interface GeneratedProfile {
  name: string;
  title: string;
  handle: string;
  status: string;
}

export function generateRandomProfile(): GeneratedProfile {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const profession = professions[Math.floor(Math.random() * professions.length)];
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  
  const name = `${firstName} ${lastName}`;
  const handle = `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${Math.floor(Math.random() * 99)}`;
  
  return {
    name,
    title: profession,
    handle,
    status
  };
}

export function generateMultipleProfiles(count: number): GeneratedProfile[] {
  const profiles: GeneratedProfile[] = [];
  const usedHandles = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let profile: GeneratedProfile;
    let attempts = 0;
    
    do {
      profile = generateRandomProfile();
      attempts++;
    } while (usedHandles.has(profile.handle) && attempts < 10);
    
    usedHandles.add(profile.handle);
    profiles.push(profile);
  }
  
  return profiles;
}
