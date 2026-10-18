/* Repositorio de frases de Pelican. Formato: [frase, autor, categoría]
 * Categorías: biblia, santos, celebres, pelican.
 * "(atribuida)" = frase muy difundida cuya autoría no está documentada con certeza.
 * Más adelante el panel de administración podrá agregar frases nuevas (hoja "Frases"). */
(function (root) {
  const Q = [
    /* --- Biblia (Reina-Valera 1960) --- */
    ['Todo lo puedo en Cristo que me fortalece.', 'Filipenses 4:13', 'biblia'],
    ['Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.', 'Josué 1:9', 'biblia'],
    ['Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.', 'Proverbios 16:3', 'biblia'],
    ['Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.', 'Colosenses 3:23', 'biblia'],
    ['El que es fiel en lo muy poco, también en lo más es fiel.', 'Lucas 16:10', 'biblia'],
    ['Todo lo que te viniere a la mano para hacer, hazlo según tus fuerzas.', 'Eclesiastés 9:10', 'biblia'],
    ['No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.', 'Isaías 41:10', 'biblia'],
    ['Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.', 'Proverbios 3:5', 'biblia'],
    ['Así alumbre vuestra luz delante de los hombres.', 'Mateo 5:16', 'biblia'],
    ['No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.', 'Gálatas 6:9', 'biblia'],
    ['Hierro con hierro se aguza; y así el hombre aguza el rostro de su amigo.', 'Proverbios 27:17', 'biblia'],
    ['Mejores son dos que uno; porque tienen mejor paga de su trabajo.', 'Eclesiastés 4:9', 'biblia'],
    ['Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá.', 'Mateo 7:7', 'biblia'],
    ['Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.', 'Salmo 118:24', 'biblia'],
    ['El alma de los diligentes será prosperada.', 'Proverbios 13:4', 'biblia'],
    ['En lo que requiere diligencia, no perezosos; fervientes en espíritu, sirviendo al Señor.', 'Romanos 12:11', 'biblia'],
    ['Todas vuestras cosas sean hechas con amor.', '1 Corintios 16:14', 'biblia'],
    ['Bien, buen siervo y fiel; sobre poco has sido fiel, sobre mucho te pondré.', 'Mateo 25:21', 'biblia'],
    ['Enséñanos de tal modo a contar nuestros días, que traigamos al corazón sabiduría.', 'Salmo 90:12', 'biblia'],
    ['Dios no nos ha dado espíritu de cobardía, sino de poder, de amor y de dominio propio.', '2 Timoteo 1:7', 'biblia'],
    ['¿Has visto hombre solícito en su trabajo? Delante de los reyes estará.', 'Proverbios 22:29', 'biblia'],
    ['Encomienda a Jehová tu camino, y confía en él; y él hará.', 'Salmo 37:5', 'biblia'],
    ['Lámpara es a mis pies tu palabra, y lumbrera a mi camino.', 'Salmo 119:105', 'biblia'],
    /* --- Santos y líderes de la Iglesia --- */
    ['No todos podemos hacer grandes cosas, pero sí cosas pequeñas con gran amor.', 'Santa Teresa de Calcuta', 'santos'],
    ['Que nada te turbe, que nada te espante; todo se pasa.', 'Santa Teresa de Jesús', 'santos'],
    ['La paciencia todo lo alcanza.', 'Santa Teresa de Jesús', 'santos'],
    ['Empieza haciendo lo necesario, luego lo posible, y de pronto estarás haciendo lo imposible.', 'San Francisco de Asís (atribuida)', 'santos'],
    ['Obra como si todo dependiera de ti; confía como si todo dependiera de Dios.', 'San Ignacio de Loyola (atribuida)', 'santos'],
    ['Ama y haz lo que quieras.', 'San Agustín', 'santos'],
    ['El mundo es un libro y quienes no viajan leen solo una página.', 'San Agustín (atribuida)', 'santos'],
    ['¡No tengan miedo!', 'San Juan Pablo II', 'santos'],
    ['No se dejen robar la esperanza.', 'Papa Francisco', 'santos'],
    ['Basta que sean jóvenes para que yo los ame.', 'San Juan Bosco (atribuida)', 'santos'],
    ['Todos nacen originales, pero muchos mueren como fotocopias.', 'San Carlo Acutis (atribuida)', 'santos'],
    ['Vivir, no vegetar.', 'Beato Pier Giorgio Frassati', 'santos'],
    ['Ser lo que debes ser, y prenderás fuego al mundo entero.', 'Santa Catalina de Siena (atribuida)', 'santos'],
    ['Ora y trabaja.', 'San Benito de Nursia', 'santos'],
    ['Consulta tus esperanzas, no tus miedos.', 'San Juan XXIII (atribuida)', 'santos'],
    ['Contento, Señor, contento.', 'San Alberto Hurtado', 'santos'],
    ['Mi vocación es el amor.', 'Santa Teresita del Niño Jesús', 'santos'],
    ['Hacer bien el trabajo de cada día, aunque sea pequeño, también es santidad.', 'Idea de San Josemaría Escrivá', 'santos'],
    ['No esperes a mañana: el momento de empezar es ahora.', 'Idea de San Francisco de Sales', 'santos'],
    /* --- Personajes célebres y gente sabia --- */
    ['Somos lo que hacemos repetidamente. La excelencia no es un acto, sino un hábito.', 'Will Durant, sobre Aristóteles', 'celebres'],
    ['Un viaje de mil millas comienza con un solo paso.', 'Lao Tse', 'celebres'],
    ['Elige un trabajo que te guste y no tendrás que trabajar ni un día de tu vida.', 'Confucio (atribuida)', 'celebres'],
    ['Todo parece imposible hasta que se hace.', 'Nelson Mandela (atribuida)', 'celebres'],
    ['El éxito consiste en ir de fracaso en fracaso sin perder el entusiasmo.', 'Winston Churchill (atribuida)', 'celebres'],
    ['El genio es uno por ciento de inspiración y noventa y nueve por ciento de transpiración.', 'Thomas Edison', 'celebres'],
    ['Sé el cambio que quieres ver en el mundo.', 'Mahatma Gandhi (atribuida)', 'celebres'],
    ['Lo importante es no dejar de hacerse preguntas.', 'Albert Einstein', 'celebres'],
    ['Al amanecer, cuando te cueste levantarte, piensa: despierto para hacer el trabajo de un ser humano.', 'Marco Aurelio', 'celebres'],
    ['No es que tengamos poco tiempo, sino que perdemos mucho.', 'Séneca', 'celebres'],
    ['Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.', 'Benjamin Franklin (atribuida)', 'celebres'],
    ['Solos podemos hacer tan poco; juntos podemos hacer mucho.', 'Helen Keller', 'celebres'],
    ['Reunirse es un comienzo; seguir juntos es progresar; trabajar juntos es tener éxito.', 'Henry Ford (atribuida)', 'celebres'],
    ['Nada grande se ha logrado sin entusiasmo.', 'Ralph Waldo Emerson', 'celebres'],
    ['El secreto para salir adelante es comenzar.', 'Mark Twain (atribuida)', 'celebres'],
    ['Dentro de veinte años estarás más decepcionado por lo que no hiciste que por lo que hiciste. Suelta amarras.', 'Mark Twain (atribuida)', 'celebres'],
    ['He fallado una y otra vez en mi vida, y por eso tengo éxito.', 'Michael Jordan', 'celebres'],
    ['El futuro pertenece a quienes creen en la belleza de sus sueños.', 'Eleanor Roosevelt (atribuida)', 'celebres'],
    ['La educación es el arma más poderosa para cambiar el mundo.', 'Nelson Mandela', 'celebres'],
    ['La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.', 'Gabriel García Márquez', 'celebres'],
    ['Caminante, no hay camino, se hace camino al andar.', 'Antonio Machado', 'celebres'],
    ['La disciplina es el puente entre las metas y los logros.', 'Jim Rohn (atribuida)', 'celebres'],
    ['Si puedes soñarlo, puedes hacerlo.', 'Walt Disney (atribuida)', 'celebres'],
    ['Lo que no conviene a la colmena no conviene a la abeja.', 'Marco Aurelio', 'celebres'],
    ['Al que madruga, Dios lo ayuda.', 'Refrán popular', 'celebres'],
    ['Camino largo se anda paso a paso.', 'Proverbio chino', 'celebres'],
    ['Quien llega a tiempo, respeta el tiempo de los demás.', 'Sabiduría popular', 'celebres'],
    /* --- Equipo Pelican --- */
    ['Quien llega a tiempo, empieza ganando.', 'Equipo Pelican', 'pelican'],
    ['Tu yo de diciembre te agradece lo que haces hoy a las 9:00.', 'Equipo Pelican', 'pelican'],
    ['Tu verano en USA se construye con hábitos como este.', 'Equipo Pelican', 'pelican'],
    ['Hoy es un buen día para ganar el día.', 'Equipo Pelican', 'pelican'],
    ['Detrás de cada estudiante que viaja hay un equipo que llegó a tiempo.', 'Equipo Pelican', 'pelican'],
    ['Out of the nest: salir de la zona cómoda empieza por las cosas pequeñas.', 'Equipo Pelican', 'pelican'],
    ['Cada experiencia que vendemos empieza con un equipo que cumple.', 'Equipo Pelican', 'pelican'],
    ['Somos un equipo: lo que haces hoy lo siente toda la oficina.', 'Equipo Pelican', 'pelican'],
    ['La constancia también es una forma de talento.', 'Equipo Pelican', 'pelican'],
    ['Primero el café, luego a volar.', 'Equipo Pelican', 'pelican'],
    ['Los sueños de nuestros estudiantes cuentan con nosotros.', 'Equipo Pelican', 'pelican'],
    ['Un equipo puntual es un equipo confiable.', 'Equipo Pelican', 'pelican'],
    ['Sonríe: hoy alguien empieza a cumplir su sueño americano gracias a ti.', 'Equipo Pelican', 'pelican'],
    ['Pequeños hábitos, grandes vuelos.', 'Equipo Pelican', 'pelican']
  ];
  /* Frase del día: avanza con un salto fijo para que dos días seguidos casi nunca sean de la misma categoría
   * y no se repita ninguna frase hasta recorrer todo el repositorio. */
  /* Se intercalan las categorías (célebres, Biblia, santos, Pelican…) y se avanza una por día:
   * así no se repite ninguna frase hasta recorrer todo el repositorio y los días seguidos varían de estilo. */
  function interleave(list) {
    const by = {}; list.forEach(q => (by[q[2]] = by[q[2]] || []).push(q));
    const order = ['celebres', 'biblia', 'santos', 'pelican'].filter(k => by[k]), out = [];
    for (let i = 0; out.length < list.length; i++) order.forEach(k => { if (by[k][Math.floor(i * by[k].length / (Math.max.apply(null, order.map(o => by[o].length))))] && i < by[k].length) out.push(by[k][i]); });
    return out;
  }
  const MIXED = interleave(Q);
  function ofDay(dayNum, list) { list = list ? interleave(list) : MIXED; return list[dayNum % list.length]; }
  const api = { QUOTES: Q, ofDay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Quotes = api;
})(typeof window !== 'undefined' ? window : globalThis);
