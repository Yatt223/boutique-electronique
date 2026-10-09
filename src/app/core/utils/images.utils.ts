/**
 * Lit une image choisie par l'utilisateur, la réduit (largeur maximale)
 * et la renvoie sous forme de data URL JPEG légère.
 */
export function redimensionnerImage(
  fichier: File,
  largeurMax = 500,
  qualite = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();

    lecteur.onerror = () => reject(new Error('Lecture du fichier impossible'));
    lecteur.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('Image invalide'));
      image.onload = () => {
        const ratio = Math.min(1, largeurMax / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);

        const contexte = canvas.getContext('2d');
        if (!contexte) {
          reject(new Error('Canvas indisponible'));
          return;
        }
        // Fond blanc : un PNG transparent deviendrait noir en JPEG
        contexte.fillStyle = '#ffffff';
        contexte.fillRect(0, 0, canvas.width, canvas.height);
        contexte.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', qualite));
      };

      image.src = lecteur.result as string;
    };

    lecteur.readAsDataURL(fichier);
  });
}
